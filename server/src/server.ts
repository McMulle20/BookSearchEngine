// Import Necessary Modules
import express from "express";
import { Request, Response } from "express";
import path from "node:path";
import db from "./config/connection.js";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

// Import GraphQL Schema
import { typeDefs, resolvers } from "./schemas/index.js";

// Import Authentication
import { authenticateToken } from "./utils/auth.js"; // Ensure authMiddleware is properly imported

// Load Environment Variables
const PORT = process.env.PORT || 3001;

// Initialize Express App
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startApolloServer = async () => {
  await server.start();
  console.log("✅ Apollo Server started successfully");

  // Apply Middleware for Apollo Server (GraphQL)
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        const user = authenticateToken(req);
        return { user };
      },
    })
  );

  // Serve Static Files from ../client/build
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.join(__dirname, "../client/build");
    console.log(`📁 Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
  }

  // React Fallback Route
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });

  // Connect to MongoDB (Using db.once("open", ...))
  db.once("open", () => {
    console.log("✅ MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`🚀 API server running on port ${PORT}`);
      console.log(`📡 GraphQL available at http://localhost:${PORT}/graphql`);
    });
  });

  db.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
  });
};

// Start the Server
startApolloServer().catch((error) => {
  console.error("❌ Server startup error:", error);
});
