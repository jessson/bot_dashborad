import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export const ProfitChart: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Profit Chart
        </Typography>
        {/* Add profit chart content here */}
      </CardContent>
    </Card>
  );
}; 