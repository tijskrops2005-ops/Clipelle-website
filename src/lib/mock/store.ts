"use client";

import { useSyncExternalStore } from "react";
import type { Project } from "@/lib/types";
import { mockProjects } from "./projects";

/**
 * MOCK STORE — keeps projects in memory on the client and mirrors them to
 * localStorage so a demo project survives a page refresh. Stage 8 replaces this
 * with a real database behind the same functions.
 */
// v2: step keys were renamed from provider names to step names; v1 entries are ignored.
const STORAGE_KEY = "reelay.demo.projects.v2";

type Listener = () => void;

let projects: Project[] = sortNewestFirst(mockProjects);
let hydratedFromStorage = false;
const listeners = new Set<Listener>();

function sortNewestFirst(list: Project[]) {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function emit() {
  for (const listener of listeners) listener();
}

function loadFromStorage() {
  if (hydratedFromStorage || typeof window === "undefined") return;
  hydratedFromStorage = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = (JSON.parse(raw) as Project[]).map(normalise);
    // Seed projects always stay; stored ones are the user's demo creations.
    const seedIds = new Set(mockProjects.map((p) => p.id));
    const extra = stored.filter((p) => !seedIds.has(p.id));
    projects = sortNewestFirst([...mockProjects, ...extra]);
    emit();
  } catch {
    // Corrupt or blocked storage: keep the seed data.
  }
}

/** Projects stored before the translate workflow existed have no `workflow` field. */
function normalise(project: Project): Project {
  return project.workflow ? project : { ...(project as Omit<Project, "workflow">), workflow: "ad" } as Project;
}

function saveToStorage() {
  try {
    const seedIds = new Set(mockProjects.map((p) => p.id));
    const extra = projects.filter((p) => !seedIds.has(p.id));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
  } catch {
    // Storage full or blocked: the project still lives in memory for this session.
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  loadFromStorage();
  return () => listeners.delete(listener);
}

const getSnapshot = () => projects;

/** Non-reactive access for the demo runner. */
export const getProjectsSnapshot = () => projects;
export const subscribeToProjects = subscribe;
// Must be a stable reference: React compares snapshots by identity during hydration.
const serverSnapshot = sortNewestFirst(mockProjects);
const getServerSnapshot = () => serverSnapshot;

/** Reactive list of all projects, newest first. */
export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useProject(id: string): Project | undefined {
  return useProjects().find((p) => p.id === id);
}

/** Adds a project and returns it. Mirrors the API the real backend will expose. */
export function addProject(project: Project) {
  projects = sortNewestFirst([project, ...projects]);
  saveToStorage();
  emit();
  return project;
}

export function updateProject(id: string, patch: (p: Project) => Project) {
  projects = projects.map((p) => (p.id === id ? patch(p) : p));
  saveToStorage();
  emit();
}
