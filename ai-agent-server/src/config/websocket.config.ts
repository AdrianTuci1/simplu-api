export const websocketConfig = {
  cors: {
    origin: true,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket'],
  path: '/socket/websocket'
}; 