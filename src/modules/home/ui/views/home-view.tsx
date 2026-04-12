"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BotIcon,
  CalendarClockIcon,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const HomeView = () => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="relative overflow-hidden rounded-3xl border border-sidebar-accent/35 bg-linear-to-br from-sidebar via-sidebar-accent to-sidebar p-6 text-sidebar-foreground shadow-2xl shadow-sidebar/20 md:p-8">
          <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

          <div className="relative space-y-4">
            <Badge
              variant="outline"
              className="gap-1 border-white/20 bg-white/10 text-white"
            >
              <SparklesIcon className="size-3" />
              AI meeting workspace
            </Badge>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Run smarter meetings with AI agents that listen, summarize, and
              help teams move faster.
            </h1>
            <p className="max-w-2xl text-sm text-sidebar-foreground/85 md:text-base">
              Meet.AI helps you create meeting agents, capture key decisions,
              and keep action items organized in one place.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button asChild size="lg">
                <Link href="/agents">
                  Create an agent
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/meetings">Join a meeting</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-sidebar-accent/25 bg-linear-to-br from-background to-sidebar-accent/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BotIcon className="size-4 text-primary" />
                1. Create AI agents
              </CardTitle>
              <CardDescription>
                Configure specialized agents for notes, follow-ups, and
                insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="ghost"
                className="px-0 text-sidebar hover:text-sidebar"
              >
                <Link href="/agents">
                  Manage agents
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-sidebar-accent/25 bg-linear-to-br from-background to-sidebar-accent/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <VideoIcon className="size-4 text-primary" />
                2. Join meetings
              </CardTitle>
              <CardDescription>
                Schedule or start meetings and keep everything centrally
                tracked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="ghost"
                className="px-0 text-sidebar hover:text-sidebar"
              >
                <Link href="/meetings">
                  Open meetings
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-sidebar-accent/25 bg-linear-to-br from-background to-sidebar-accent/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClockIcon className="size-4 text-primary" />
                3. Scale with premium
              </CardTitle>
              <CardDescription>
                Unlock more usage and advanced capabilities as your team grows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="ghost"
                className="px-0 text-sidebar hover:text-sidebar"
              >
                <Link href="/upgrade">
                  See upgrade plans
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
