export type SecretTemplate = {
  id: string;
  label: string;
  keys: string[];
};

export const SECRET_TEMPLATES: SecretTemplate[] = [
  {
    id: "nextjs",
    label: "Next.js App",
    keys: ["NEXTAUTH_SECRET", "DATABASE_URL", "NEXT_PUBLIC_API_BASE_URL"],
  },
  {
    id: "node",
    label: "Node Service",
    keys: ["NODE_ENV", "PORT", "JWT_SECRET", "DATABASE_URL"],
  },
  {
    id: "database",
    label: "Database",
    keys: ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"],
  },
];
