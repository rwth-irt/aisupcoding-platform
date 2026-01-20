// src/pages/AnalyticsPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api'; 
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const mergeTimelineData = (llms, feedbacks) => {
  const dataMap = new Map();
  const processData = (data, key) => {
    data.forEach(item => {
      const { startTime, count } = item;
      if (!dataMap.has(startTime)) {
        dataMap.set(startTime, { 
          time: new Date(startTime).toLocaleString(),
          startTime: startTime, 
          llms: 0,
          feedbacks: 0,
        });
      }
      dataMap.get(startTime)[key] = count;
    });
  };

  // Process all three datasets
  processData(llms, 'llms');
  processData(feedbacks, 'feedbacks');

  // Convert map values to an array and sort by time
  return Array.from(dataMap.values()).sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );
};


function AnalyticsPage() {
  const [timelineData, setTimelineData] = useState([]);
  const [status, setStatus] = useState('Loading chart data...');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch endpoints in parallel
        const [llmsRes, feedbacksRes] = await Promise.all([
          api.get('/analytics/llm-timeline'),
          api.get('/analytics/feedback-timeline')
        ]);

        // Merge the data
        const mergedData = mergeTimelineData( 
          llmsRes.data, 
          feedbacksRes.data
        );
        
        setTimelineData(mergedData);
        setStatus(''); 
        
        if (mergedData.length === 0) {
            setStatus('No request data found to display.');
        }

      } catch (error) {
        console.error('Error fetching analytics:', error);
        setStatus('Error loading chart data. Please try again later.');
      }
    };

    fetchData();
  }, []); 

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '50px auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>User Analytics</h2>
        <Link 
          to="/dashboard" 
          className="neutral-button"
        >
          Back to Dashboard
        </Link>
      </div>

      <p>This chart shows the number of student request events binned in 3-hour intervals (excluding user 70000007).</p>
      {status && <p><strong>Status:</strong> {status}</p>}

      <div style={{ width: '100%', height: '400px', marginTop: '30px' }}>
        <ResponsiveContainer>
          <LineChart
            data={timelineData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={false} 
              label={{ value: 'Time (Ascending)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              labelFormatter={(value, payload) => payload && payload.length ? payload[0].payload.time : ''} 
            />
            <Legend />
            
            {/* Line 1: LLMs */}
            <Line 
              type="monotone" 
              dataKey="llms" 
              name="LLM Requests" 
              stroke="#407fb7" 
              activeDot={{ r: 8 }} 
            />
            
            {/* Line 2: Feedbacks */}
            <Line 
              type="monotone" 
              dataKey="feedbacks" 
              name="Feedback Events" 
              stroke="#d85c41"
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AnalyticsPage;