use actix_web::{App, test};
use jsonwebtoken::{EncodingKey, Header, encode};
use personal_github_dashboard::routes::init_routes;
use personal_github_dashboard::utils::config::Config;
use personal_github_dashboard::utils::redis::RedisClient;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

#[actix_web::test]
async fn test_repository_cache_flow() {
    // Setup
    let config = Config::from_env();
    let pool = PgPool::connect(&config.database_url).await.unwrap();
    let redis = RedisClient::new(&config.redis_url).await.unwrap();

    // Clean up test repo if exists
    let test_repo_name = "cachetestrepo";
    sqlx::query("DELETE FROM repositories WHERE name = $1")
        .bind(test_repo_name)
        .execute(&pool)
        .await
        .unwrap();

    // JWT setup
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let claims = Claims {
        sub: "testuser".to_string(),
        exp: 2000000000,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .unwrap();

    // Start app
    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool.clone()))
            .app_data(actix_web::web::Data::new(redis.clone()))
            .configure(init_routes),
    )
    .await;

    // Create repository (POST)
    let test_owner_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    // Insert test user (owner) required for FK
    sqlx::query("INSERT INTO users (id, username, email, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING")
        .bind(test_owner_id)
        .bind("testuser")
        .bind("testuser@example.com")
        .execute(&pool)
        .await
        .unwrap();
    let req = test::TestRequest::post()
        .uri("/api/repositories")
        .set_json(serde_json::json!({
            "owner_id": test_owner_id,
            "name": test_repo_name,
            "description": "Test repo for cache integration",
            "is_private": false
        }))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body = test::read_body(resp).await;
    println!("POST /api/repositories status: {}", status);
    println!("POST /api/repositories raw body: {:?}", body);
    assert_eq!(status, 201);
    let resp_json: serde_json::Value =
        serde_json::from_slice(&body).expect("POST response is not valid JSON");
    let repo_id = resp_json["id"].as_str().unwrap();

    // First GET: should hit DB, populate cache
    let req = test::TestRequest::get()
        .uri(&format!("/api/repositories/{}", repo_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body = test::read_body(resp).await;
    println!("GET /api/repositories/{} status: {}", repo_id, status);
    println!("GET /api/repositories/{} raw body: {:?}", repo_id, body);
    assert_eq!(status, 200);
    let resp1: serde_json::Value =
        serde_json::from_slice(&body).expect("GET response is not valid JSON");
    assert_eq!(resp1["name"], test_repo_name);

    // Second GET: should hit cache
    let req = test::TestRequest::get()
        .uri(&format!("/api/repositories/{}", repo_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body = test::read_body(resp).await;
    println!(
        "GET (cache) /api/repositories/{} status: {}",
        repo_id, status
    );
    println!(
        "GET (cache) /api/repositories/{} raw body: {:?}",
        repo_id, body
    );
    assert_eq!(status, 200);
    let resp2: serde_json::Value =
        serde_json::from_slice(&body).expect("GET (cache) response is not valid JSON");
    assert_eq!(resp2["name"], test_repo_name);

    // Update repository description (PUT)
    let req = test::TestRequest::put()
        .uri(&format!("/api/repositories/{}/description", repo_id))
        .set_json(serde_json::json!({"description": "Updated description"}))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body = test::read_body(resp).await;
    println!(
        "PUT /api/repositories/{}/description status: {}",
        repo_id, status
    );
    println!(
        "PUT /api/repositories/{}/description raw body: {:?}",
        repo_id, body
    );
    assert_eq!(status, 200);
    let resp: serde_json::Value =
        serde_json::from_slice(&body).expect("PUT response is not valid JSON");
    assert_eq!(resp["description"], "Updated description");

    // Delete repository (DELETE)
    let req = test::TestRequest::delete()
        .uri(&format!("/api/repositories/{}", repo_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    println!("DELETE /api/repositories/{} status: {}", repo_id, status);
    assert_eq!(status, 204);

    // GET after delete: should return 404
    let req = test::TestRequest::get()
        .uri(&format!("/api/repositories/{}", repo_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    println!(
        "GET (after delete) /api/repositories/{} status: {}",
        repo_id, status
    );
    assert_eq!(status, 404);
}
