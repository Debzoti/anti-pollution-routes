import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
        title: 'Anti-Pollution Routes API',
        description: 'API for calculating low-pollution routes based on air quality, weather, and traffic data',
        version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http', 'https'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js']; // your main express 

swaggerAutogen()(outputFile, endpointsFiles, doc);