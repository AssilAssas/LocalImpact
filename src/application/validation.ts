import { z } from "zod";
import { CATEGORIES, REPORT_STATUSES, ROLES } from "@/domain/types";
import { MIN_RESOLUTION_NOTE_LENGTH } from "@/domain/report-rules";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "Le nom ne peut pas dépasser 80 caractères."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .max(120, "L'adresse e-mail est trop longue."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide."),
  password: z
    .string()
    .min(1, "Le mot de passe est requis.")
    .max(128, "Mot de passe invalide."),
});

export const createReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Le titre doit contenir au moins 5 caractères.")
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
  description: z
    .string()
    .trim()
    .min(15, "La description doit contenir au moins 15 caractères.")
    .max(2000, "La description ne peut pas dépasser 2000 caractères."),
  category: z.enum(CATEGORIES, {
    message: "Catégorie invalide.",
  }),
  location: z
    .string()
    .trim()
    .min(2, "Le lieu est requis.")
    .max(120, "Le lieu ne peut pas dépasser 120 caractères."),
});

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Le commentaire doit contenir au moins 2 caractères.")
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères."),
});

export const assignReportSchema = z.object({
  assignedToId: z
    .string()
    .trim()
    .min(1, "Veuillez sélectionner un responsable."),
});

export const transitionStatusSchema = z
  .object({
    targetStatus: z.enum(REPORT_STATUSES, {
      message: "Statut cible invalide.",
    }),
    note: z
      .string()
      .trim()
      .max(1500, "La note ne peut pas dépasser 1500 caractères.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetStatus === "RESOLU") {
      const length = data.note?.trim().length ?? 0;
      if (length < MIN_RESOLUTION_NOTE_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path: ["note"],
          message: `Une description de l'intervention d'au moins ${MIN_RESOLUTION_NOTE_LENGTH} caractères est obligatoire pour résoudre un signalement.`,
        });
      }
    }
  });

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES, {
    message: "Rôle invalide.",
  }),
});

export const reportFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  location: z.string().trim().max(120).optional(),
  assignedToId: z.string().trim().optional(),
});

export function validatePhotoFile(file: {
  size: number;
  type: string;
}): string | null {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return "Format de photo non supporté. Formats acceptés : JPEG, PNG ou WebP.";
  }
  if (file.size <= 0) {
    return "Le fichier photo est vide.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "La photo ne doit pas dépasser 5 Mo.";
  }
  return null;
}
