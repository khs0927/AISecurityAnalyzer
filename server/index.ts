import apiRoutes from './routes';

// API 라우트 설정
const apiPrefix = config.server.apiPrefix || '/api';
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRouter);

// 통합 API 라우트 설정
app.use(apiPrefix, apiRoutes);