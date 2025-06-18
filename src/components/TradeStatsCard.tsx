import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export const TradeStatsCard: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trade Stats
        </Typography>
        {/* Add trade stats content here */}
      </CardContent>
    </Card>
  );
}; 