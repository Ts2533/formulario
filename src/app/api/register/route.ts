import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Faltan las variables de entorno de Supabase.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

class ClientError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type RateLimitEntry = { hits: number; expiresAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

const ALLOWED_SERVICES = new Set(["AM", "PM", "1/2"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\-.\s]{7,20}$/;

function getClientId(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function enforceRateLimit(clientId: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (entry && entry.expiresAt > now) {
    if (entry.hits >= RATE_LIMIT_MAX_REQUESTS) {
      throw new ClientError("Demasiadas solicitudes, intenta de nuevo en unos minutos.", 429);
    }

    entry.hits += 1;
    rateLimitStore.set(clientId, entry);
    return;
  }

  rateLimitStore.set(clientId, {
    hits: 1,
    expiresAt: now + RATE_LIMIT_WINDOW_MS,
  });
}

function sanitizeText(value: string, maxLength: number) {
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength);
}

function parseField(
  formData: FormData,
  key: string,
  options: { maxLength?: number; pattern?: RegExp; label?: string } = {}
) {
  const label = options.label || key.replace(/_/g, " ");
  const value = formData.get(key);
  if (!value) throw new ClientError(`El campo ${label} es obligatorio.`);

  const sanitized = sanitizeText(value.toString(), options.maxLength ?? 180);
  if (!sanitized) throw new ClientError(`El campo ${label} es obligatorio.`);

  if (options.pattern && !options.pattern.test(sanitized)) {
    throw new ClientError(`${label} tiene un formato inválido.`);
  }

  return sanitized;
}

function parseServices(formData: FormData) {
  const services = formData
    .getAll("service_options")
    .map((x) => sanitizeText(x.toString(), 10))
    .filter(Boolean);

  const unique = Array.from(new Set(services));
  const invalid = unique.filter((s) => !ALLOWED_SERVICES.has(s));

  if (invalid.length > 0 || unique.length === 0) {
    throw new ClientError("Selecciona al menos un servicio válido (AM, PM o 1/2).");
  }

  return unique;
}

export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(getClientId(req));

    const formData = await req.formData();

    const student_name = parseField(formData, "student_name", {
      maxLength: 120,
      label: "nombre del estudiante",
    });
    const grade = parseField(formData, "grade", {
      maxLength: 15,
      label: "grado a cursar",
      pattern: /^[A-Za-z0-9°º\s-]{1,15}$/,
    });
    const address = parseField(formData, "address", { maxLength: 150, label: "dirección" });
    const municipio = parseField(formData, "municipio", { maxLength: 100 });
    const sector = parseField(formData, "sector", { maxLength: 100 });
    const urbanizacion = parseField(formData, "urbanizacion", { maxLength: 100 });
    const bloque = parseField(formData, "bloque", { maxLength: 50, label: "bloque o interior" });

    const father_name = parseField(formData, "father_name", {
      maxLength: 120,
      label: "nombre del padre",
    });
    const father_phone = parseField(formData, "father_phone", {
      maxLength: 20,
      label: "celular del padre",
      pattern: phonePattern,
    });
    const father_office_phone = parseField(formData, "father_office_phone", {
      maxLength: 20,
      label: "teléfono de oficina (padre)",
      pattern: phonePattern,
    });
    const father_email = parseField(formData, "father_email", {
      maxLength: 120,
      label: "email del padre",
      pattern: emailPattern,
    });

    const mother_name = parseField(formData, "mother_name", {
      maxLength: 120,
      label: "nombre de la madre",
    });
    const mother_phone = parseField(formData, "mother_phone", {
      maxLength: 20,
      label: "celular de la madre",
      pattern: phonePattern,
    });
    const mother_office_phone = parseField(formData, "mother_office_phone", {
      maxLength: 20,
      label: "teléfono de oficina (madre)",
      pattern: phonePattern,
    });
    const mother_email = parseField(formData, "mother_email", {
      maxLength: 120,
      label: "email de la madre",
      pattern: emailPattern,
    });

    const other_guardian = parseField(formData, "other_guardian", {
      maxLength: 120,
      label: "otro acudiente",
    });
    const other_guardian_phone = parseField(formData, "other_guardian_phone", {
      maxLength: 20,
      label: "celular del otro acudiente",
      pattern: phonePattern,
    });
    const responsible_id = parseField(formData, "responsible_id", {
      maxLength: 30,
      label: "cédula del responsable",
      pattern: /^[A-Za-z0-9\-.]{5,30}$/,
    });
    const observaciones = parseField(formData, "observaciones", { maxLength: 500 });

    const service_options = parseServices(formData);

    const { error: insertError } = await supabase.from("submissions").insert({
      student_name,
      grade,
      service_options,
      address,
      municipio,
      sector,
      urbanizacion,
      bloque,
      father_name,
      father_phone,
      father_office_phone,
      father_email,
      mother_name,
      mother_phone,
      mother_office_phone,
      mother_email,
      other_guardian,
      other_guardian_phone,
      responsible_id,
      observaciones,
    });

    if (insertError) {
      console.error("SUPABASE INSERT ERROR:", insertError);
      throw new Error("No se pudo guardar el formulario.");
    }

    return NextResponse.json({
      success: true,
      message: "Formulario enviado correctamente",
    });
  } catch (err) {
    console.error("API ERROR:", err);

    const status = err instanceof ClientError ? err.status : 500;
    const message = err instanceof ClientError ? err.message : "Error interno, intenta más tarde.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
