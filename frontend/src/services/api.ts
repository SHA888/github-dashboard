import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

export interface Repository {
    id: number;
    name: string;
    owner: string;
    url: string;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
    last_updated?: string;
}

export interface ActivityData {
    commit_activity: {
        daily: number[];
        weekly: number[];
        monthly: number[];
    };
    issue_metrics: {
        open: number;
        closed: number;
        average_resolution_time: string;
    };
    pr_metrics: {
        open: number;
        merged: number;
        average_merge_time: string;
    };
}

class ApiService {
    private handleError(error: AxiosError): ApiError {
        if (error.response) {
            return {
                message: error.response.data as string || 'An error occurred',
                status: error.response.status,
                code: error.code
            };
        }
        return {
            message: error.message || 'An error occurred',
            code: error.code
        };
    }

    async listRepositories(): Promise<{ data: { repositories: Repository[] } }> {
        try {
            const response = await axios.get(`${API_BASE_URL}/repos`);
            return response;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    async getRepositoryDetails(id: number): Promise<Repository> {
        try {
            const response = await axios.get(`${API_BASE_URL}/repos/${id}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    async getRepositoryAnalytics(owner: string, repo: string): Promise<{ data: ActivityData }> {
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/repos/${owner}/${repo}`);
            return response;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    async getActivityTrends(owner: string, repo: string, timeRange: string): Promise<{ data: ActivityData }> {
        try {
            const response = await axios.get(`${API_BASE_URL}/analytics/activity/${owner}/${repo}`, {
                params: { timeRange }
            });
            return response;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    async addRepository(owner: string, repo: string): Promise<Repository> {
        try {
            const response = await axios.post(`${API_BASE_URL}/repos`, {
                owner,
                name: repo
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    async removeRepository(id: number): Promise<void> {
        try {
            await axios.delete(`${API_BASE_URL}/repos/${id}`);
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }
}

export const apiService = new ApiService(); 