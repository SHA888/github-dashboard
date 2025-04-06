import React, { useState } from "react";
import { Box, Grid, Paper, TextField, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";
import RepositoryActivity from "./RepositoryActivity";
import Trends from "./Trends";

const DashboardPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

interface Filters {
  timeRange: string;
  owner: string;
  repo: string;
}

interface AnalyticsLayoutProps {
  onFilterChange: (filters: Filters) => void;
}

const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  onFilterChange,
}) => {
  const [filters, setFilters] = useState<Filters>({
    timeRange: "30",
    owner: "SHA888", // Default owner
    repo: "github-dashboard", // Default repo
  });

  const handleFilterChange = (field: keyof Filters, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Filter Controls */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          select
          label="Time Range"
          value={filters.timeRange}
          onChange={(e) => handleFilterChange("timeRange", e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="7">Last 7 days</MenuItem>
          <MenuItem value="30">Last 30 days</MenuItem>
          <MenuItem value="90">Last 90 days</MenuItem>
          <MenuItem value="180">Last 180 days</MenuItem>
          <MenuItem value="365">Last year</MenuItem>
        </TextField>
        <TextField
          label="Owner"
          value={filters.owner}
          onChange={(e) => handleFilterChange("owner", e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          label="Repository"
          value={filters.repo}
          onChange={(e) => handleFilterChange("repo", e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Repository Activity */}
        <Grid item xs={12} md={6}>
          <DashboardPaper>
            <RepositoryActivity filters={filters} />
          </DashboardPaper>
        </Grid>

        {/* Trends */}
        <Grid item xs={12} md={6}>
          <DashboardPaper>
            <Trends filters={filters} />
          </DashboardPaper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsLayout;
