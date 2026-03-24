export const config = {
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID as string,
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID as string,
    region: import.meta.env.VITE_REGION as string || "us-east-1",
  },
} as const;
