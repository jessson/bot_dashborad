import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export const ChainStatsCard: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Chain Stats
        </Typography>
        {/* Add chain stats content here */}
      </CardContent>
    </Card>
  );
}; 