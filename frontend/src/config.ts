export const config = {
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID as string,
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID as string,
    identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID as string,
    region: import.meta.env.VITE_REGION as string || "us-east-1",
  },
  location: {
    placeIndexName: import.meta.env.VITE_PLACE_INDEX_NAME as string || "runmaprepeat-places",
    region: import.meta.env.VITE_REGION as string || "us-east-1",
  },
} as const;
