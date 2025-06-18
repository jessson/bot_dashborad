import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export const TradeList: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trade List
        </Typography>
        {/* Add trade list content here */}
      </CardContent>
    </Card>
  );
}; 