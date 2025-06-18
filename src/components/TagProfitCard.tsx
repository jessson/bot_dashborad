import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export const TagProfitCard: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tag Profit
        </Typography>
        {/* Add tag profit content here */}
      </CardContent>
    </Card>
  );
}; 