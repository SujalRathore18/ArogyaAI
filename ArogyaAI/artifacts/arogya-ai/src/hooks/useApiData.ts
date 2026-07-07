import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface Hospital {
  id: number;
  name: string;
  lat: number;
  lng: number;
  specialties: string[];
  icu: boolean;
  trauma: boolean;
  cardiac: boolean;
  beds: number;
  reviews: number;
  icuPct: number;
  bedPct: number;
}

export interface Medicine {
  id: number;
  name: string;
  stock: number;
  burnRate: number;
  phc: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  phc: string;
  present: boolean;
}

export interface Zone {
  id: number;
  locality: string;
  lat: number;
  lng: number;
  risk: "red" | "orange" | "blue";
}

export interface Alert {
  id: number;
  locality: string;
  rule: string;
  detail: string;
  transcript: string | null;
  field: string | null;
  risk: "yellow" | "orange" | "red";
  createdAt: string;
}

export function useHospitals() {
  return useQuery({
    queryKey: ["hospitals"],
    queryFn: () => apiFetch<{ hospitals: Hospital[] }>("/hospitals").then((r) => r.hospitals),
  });
}

export function useMedicines() {
  return useQuery({
    queryKey: ["medicines"],
    queryFn: () => apiFetch<{ medicines: Medicine[] }>("/medicines").then((r) => r.medicines),
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiFetch<{ doctors: Doctor[] }>("/doctors").then((r) => r.doctors),
  });
}

export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: () => apiFetch<{ zones: Zone[] }>("/zones").then((r) => r.zones),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiFetch<{ alerts: Alert[] }>("/alerts").then((r) => r.alerts),
  });
}
