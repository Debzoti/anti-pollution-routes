import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Anti-Pollution Routes API',
    description: 'API for calculating pollution exposure scores for routes in Indian cities',
    version: '1.0.0',
  },
  host: 'localhost:3000',
  schemes: ['http'],
  tags: [
    {
      name: 'Routes',
      description: 'Route scoring endpoints',
    },
    {
      name: 'SSE',
      description: 'Server-Sent Events for live updates',
    },
  ],
};

const outputFile = './swagger-output.json';
const routes = ['./server.js'];

swaggerAutogen()(outputFile, routes, doc);
