import { connectDB } from "@/db";
import { Agent } from "@/db/schema";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

export const agentRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    await connectDB();

    const data = await Agent.find();
    
    return data;
  }),
});