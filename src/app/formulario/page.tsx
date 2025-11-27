"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";

const serviceOptions = ["AM", "PM", "1/2"] as const;
type ServiceOption = (typeof serviceOptions)[number];

const gradePattern = /^[A-Za-z0-9°º\s-]{1,15}$/;
const phonePattern = /^[0-9+()\-.\s]{7,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const idPattern = /^[A-Za-z0-9\-.]{5,30}$/;

type FormValues = {
  student_name: string;
  grade: string;
  service_options: ServiceOption[];
  address: string;
  municipio: string;
  sector: string;
  urbanizacion: string;
  bloque: string;
  father_name: string;
  father_phone: string;
  father_office_phone: string;
  father_email: string;
  mother_name: string;
  mother_phone: string;
  mother_office_phone: string;
  mother_email: string;
  other_guardian: string;
  other_guardian_phone: string;
  responsible_id: string;
  observaciones: string;
};

type TextFieldName = Exclude<keyof FormValues, "service_options">;
type FieldName = keyof FormValues;

type FieldRule = {
  label: string;
  maxLength: number;
  pattern?: RegExp;
  patternMsg?: string;
};

const phoneRule: Omit<FieldRule, "label"> = {
  maxLength: 20,
  pattern: phonePattern,
  patternMsg: "Ingresa un teléfono válido (7-20 dígitos, se permiten + ( ) - . y espacios).",
};

const emailRule: Omit<FieldRule, "label"> = {
  maxLength: 120,
  pattern: emailPattern,
  patternMsg: "Ingresa un correo válido.",
};

const fieldRules: Record<TextFieldName, FieldRule> = {
  student_name: { label: "nombre del estudiante", maxLength: 120 },
  grade: {
    label: "grado a cursar",
    maxLength: 15,
    pattern: gradePattern,
    patternMsg: "Usa solo letras o números, máximo 15 caracteres.",
  },
  address: { label: "dirección", maxLength: 150 },
  municipio: { label: "municipio", maxLength: 100 },
  sector: { label: "sector", maxLength: 100 },
  urbanizacion: { label: "urbanización", maxLength: 100 },
  bloque: { label: "bloque o interior", maxLength: 50 },
  father_name: { label: "nombre del padre", maxLength: 120 },
  father_phone: { label: "celular del padre", ...phoneRule },
  father_office_phone: { label: "teléfono de oficina (padre)", ...phoneRule },
  father_email: { label: "email del padre", ...emailRule },
  mother_name: { label: "nombre de la madre", maxLength: 120 },
  mother_phone: { label: "celular de la madre", ...phoneRule },
  mother_office_phone: { label: "teléfono de oficina (madre)", ...phoneRule },
  mother_email: { label: "email de la madre", ...emailRule },
  other_guardian: { label: "otro acudiente", maxLength: 120 },
  other_guardian_phone: { label: "celular del otro acudiente", ...phoneRule },
  responsible_id: {
    label: "cédula del responsable",
    maxLength: 30,
    pattern: idPattern,
    patternMsg: "Solo números, letras, puntos o guiones (5-30 caracteres).",
  },
  observaciones: { label: "observaciones", maxLength: 500 },
};

const initialValues: FormValues = {
  student_name: "",
  grade: "",
  service_options: [],
  address: "",
  municipio: "",
  sector: "",
  urbanizacion: "",
  bloque: "",
  father_name: "",
  father_phone: "",
  father_office_phone: "",
  father_email: "",
  mother_name: "",
  mother_phone: "",
  mother_office_phone: "",
  mother_email: "",
  other_guardian: "",
  other_guardian_phone: "",
  responsible_id: "",
  observaciones: "",
};

export default function FormularioPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateTextField(name: TextFieldName, value: string) {
    const rule = fieldRules[name];
    const trimmed = value.trim();

    if (!trimmed) return `El campo ${rule.label} es obligatorio.`;
    if (trimmed.length > rule.maxLength) {
      return `${rule.label} debe tener máximo ${rule.maxLength} caracteres.`;
    }
    if (rule.pattern && !rule.pattern.test(trimmed)) {
      return rule.patternMsg || `${rule.label} tiene un formato inválido.`;
    }

    return "";
  }

  function validateServices(services: ServiceOption[]) {
    const unique = Array.from(new Set(services));
    const valid = unique.filter((option) => serviceOptions.includes(option));

    if (valid.length === 0) return "Selecciona al menos un servicio (AM, PM o 1/2).";
    return "";
  }

  function validateAll(nextValues: FormValues = values) {
    const newErrors: Partial<Record<FieldName, string>> = {};

    (Object.keys(fieldRules) as TextFieldName[]).forEach((key) => {
      const errorMessage = validateTextField(key, nextValues[key]);
      if (errorMessage) newErrors[key] = errorMessage;
    });

    const servicesError = validateServices(nextValues.service_options);
    if (servicesError) newErrors.service_options = servicesError;

    return newErrors;
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (!(name in fieldRules)) return;

    const fieldName = name as TextFieldName;
    if (error) setError(null);
    setValues((prev) => ({ ...prev, [fieldName]: value }));

    const errorMessage = validateTextField(fieldName, value);
    setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
  }

  function handleServiceChange(option: ServiceOption, checked: boolean) {
    if (error) setError(null);
    setValues((prev) => {
      const nextServices = checked
        ? Array.from(new Set([...prev.service_options, option]))
        : prev.service_options.filter((value) => value !== option);

      setFieldErrors((prevErrors) => ({
        ...prevErrors,
        service_options: validateServices(nextServices),
      }));

      return { ...prev, service_options: nextServices };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Por favor corrige los campos marcados.");
      return;
    }

    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo enviar el formulario");
      }

      setMsg("Formulario enviado correctamente");
      setValues(initialValues);
      setFieldErrors({});
      form.reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al enviar el formulario";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "text-sm font-semibold text-gray-800";
  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-black via-red-10 to-red-600 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-2 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-red-100">
                Transporte escolar Ruta07
              </p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                Reserva Ruta Escolar 2026
              </h1>
              <div className="flex flex-col gap-1 text-sm text-red-50 sm:flex-row sm:items-center sm:gap-3">
                <p className="font-semibold">Colegio Luis Amigó</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-red-50 backdrop-blur">
                  Respuesta inmediata
                </span>
              </div>
              <p className="max-w-3xl text-sm text-50 sm:text-base">
                Favor diligenciar el formulario con el fin de garantizar el cupo de
                transporte para el año 2026.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-3xl border-2 border-black  bg-white p-3 shadow-black  shadow-[0_10px_25px_rgba(0,0,0,0.15)] backdrop-blur">
                <Image
                  src="/favicon.ico"
                  alt="Icono Ruta07"
                  width={92}
                  height={92}
                  className="h-16 w-16 sm:h-24 sm:w-24"
                  priority
                />
              </div>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-10 rounded-2xl bg-white/90 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { step: "01", title: "Estudiante", desc: "Datos del alumno" },
              { step: "02", title: "Acudientes", desc: "Contactos y firma" },
              { step: "03", title: "Confirmación", desc: "Observaciones y envío" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white/70 px-4 py-3 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 text-sm font-bold text-white">
                  {item.step}
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-700">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                  Datos del alumno
                </p>
                <h2 className="text-lg font-bold text-gray-900">
                  Información del estudiante
                </h2>
              </div>
              <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Todos los campos son obligatorios
              </span>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="student_name">
                  Nombre y apellidos
                </label>
                <input
                  id="student_name"
                  name="student_name"
                  placeholder="Nombre completo del estudiante"
                  required
                  className={inputClass}
                  value={values.student_name}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.student_name)}
                  aria-describedby="student_name_error"
                />
                {fieldErrors.student_name && (
                  <p id="student_name_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.student_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="grade">
                  Grado a cursar
                </label>
                <input
                  id="grade"
                  name="grade"
                  placeholder="Ej: 6°"
                  required
                  className={inputClass}
                  value={values.grade}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.grade)}
                  aria-describedby="grade_error"
                />
                {fieldErrors.grade && (
                  <p id="grade_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.grade}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className={labelClass}>Servicio (selección múltiple)</p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  {serviceOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:border-red-400"
                    >
                      <input
                        type="checkbox"
                        name="service_options"
                        value={option}
                        className="h-4 w-4 accent-red-600"
                        checked={values.service_options.includes(option)}
                        onChange={(ev) => handleServiceChange(option, ev.target.checked)}
                        aria-invalid={Boolean(fieldErrors.service_options)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {fieldErrors.service_options && (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.service_options}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="address">
                  Dirección
                </label>
                <input
                  id="address"
                  name="address"
                  placeholder="Dirección completa"
                  required
                  className={inputClass}
                  value={values.address}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby="address_error"
                />
                {fieldErrors.address && (
                  <p id="address_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="municipio">
                  Municipio
                </label>
                <input
                  id="municipio"
                  name="municipio"
                  placeholder="Municipio"
                  required
                  className={inputClass}
                  value={values.municipio}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.municipio)}
                  aria-describedby="municipio_error"
                />
                {fieldErrors.municipio && (
                  <p id="municipio_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.municipio}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sector">
                  Sector
                </label>
                <input
                  id="sector"
                  name="sector"
                  placeholder="Sector"
                  required
                  className={inputClass}
                  value={values.sector}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.sector)}
                  aria-describedby="sector_error"
                />
                {fieldErrors.sector && (
                  <p id="sector_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.sector}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="urbanizacion">
                  Urbanización
                </label>
                <input
                  id="urbanizacion"
                  name="urbanizacion"
                  placeholder="Urbanización"
                  required
                  className={inputClass}
                  value={values.urbanizacion}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.urbanizacion)}
                  aria-describedby="urbanizacion_error"
                />
                {fieldErrors.urbanizacion && (
                  <p id="urbanizacion_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.urbanizacion}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="bloque">
                  Bloque ó Interior
                </label>
                <input
                  id="bloque"
                  name="bloque"
                  placeholder="Bloque o interior"
                  required
                  className={inputClass}
                  value={values.bloque}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.bloque)}
                  aria-describedby="bloque_error"
                />
                {fieldErrors.bloque && (
                  <p id="bloque_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.bloque}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                  Datos de acudientes
                </p>
                <h2 className="text-lg font-bold text-gray-900">
                  Información de contacto
                </h2>
              </div>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="father_name">
                  Nombre del padre
                </label>
                <input
                  id="father_name"
                  name="father_name"
                  placeholder="Nombre completo"
                  required
                  className={inputClass}
                  value={values.father_name}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.father_name)}
                  aria-describedby="father_name_error"
                />
                {fieldErrors.father_name && (
                  <p id="father_name_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.father_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="father_phone">
                  Celular (padre)
                </label>
                <input
                  id="father_phone"
                  name="father_phone"
                  type="tel"
                  placeholder="Celular del padre"
                  required
                  className={inputClass}
                  value={values.father_phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.father_phone)}
                  aria-describedby="father_phone_error"
                />
                {fieldErrors.father_phone && (
                  <p id="father_phone_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.father_phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="father_office_phone">
                  Teléfono de oficina (padre)
                </label>
                <input
                  id="father_office_phone"
                  name="father_office_phone"
                  type="tel"
                  placeholder="Número de oficina"
                  required
                  className={inputClass}
                  value={values.father_office_phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.father_office_phone)}
                  aria-describedby="father_office_phone_error"
                />
                {fieldErrors.father_office_phone && (
                  <p id="father_office_phone_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.father_office_phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="father_email">
                  Email (padre)
                </label>
                <input
                  id="father_email"
                  name="father_email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  required
                  className={inputClass}
                  value={values.father_email}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.father_email)}
                  aria-describedby="father_email_error"
                />
                {fieldErrors.father_email && (
                  <p id="father_email_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.father_email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="mother_name">
                  Nombre de la madre
                </label>
                <input
                  id="mother_name"
                  name="mother_name"
                  placeholder="Nombre completo"
                  required
                  className={inputClass}
                  value={values.mother_name}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.mother_name)}
                  aria-describedby="mother_name_error"
                />
                {fieldErrors.mother_name && (
                  <p id="mother_name_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.mother_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="mother_phone">
                  Celular (madre)
                </label>
                <input
                  id="mother_phone"
                  name="mother_phone"
                  type="tel"
                  placeholder="Celular de la madre"
                  required
                  className={inputClass}
                  value={values.mother_phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.mother_phone)}
                  aria-describedby="mother_phone_error"
                />
                {fieldErrors.mother_phone && (
                  <p id="mother_phone_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.mother_phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="mother_office_phone">
                  Teléfono de oficina (madre)
                </label>
                <input
                  id="mother_office_phone"
                  name="mother_office_phone"
                  type="tel"
                  placeholder="Número de oficina"
                  required
                  className={inputClass}
                  value={values.mother_office_phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.mother_office_phone)}
                  aria-describedby="mother_office_phone_error"
                />
                {fieldErrors.mother_office_phone && (
                  <p id="mother_office_phone_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.mother_office_phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="mother_email">
                  Email (madre)
                </label>
                <input
                  id="mother_email"
                  name="mother_email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  required
                  className={inputClass}
                  value={values.mother_email}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.mother_email)}
                  aria-describedby="mother_email_error"
                />
                {fieldErrors.mother_email && (
                  <p id="mother_email_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.mother_email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="other_guardian">
                  Otro acudiente
                </label>
                <input
                  id="other_guardian"
                  name="other_guardian"
                  placeholder="Nombre del acudiente"
                  required
                  className={inputClass}
                  value={values.other_guardian}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.other_guardian)}
                  aria-describedby="other_guardian_error"
                />
                {fieldErrors.other_guardian && (
                  <p id="other_guardian_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.other_guardian}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="other_guardian_phone">
                  Celular (otro acudiente)
                </label>
                <input
                  id="other_guardian_phone"
                  name="other_guardian_phone"
                  type="tel"
                  placeholder="Celular del acudiente"
                  required
                  className={inputClass}
                  value={values.other_guardian_phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.other_guardian_phone)}
                  aria-describedby="other_guardian_phone_error"
                />
                {fieldErrors.other_guardian_phone && (
                  <p id="other_guardian_phone_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.other_guardian_phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="responsible_id">
                  Cédula del responsable
                </label>
                <input
                  id="responsible_id"
                  name="responsible_id"
                  placeholder="Número de documento"
                  required
                  className={inputClass}
                  value={values.responsible_id}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(fieldErrors.responsible_id)}
                  aria-describedby="responsible_id_error"
                />
                {fieldErrors.responsible_id && (
                  <p id="responsible_id_error" className="text-xs font-semibold text-red-600">
                    {fieldErrors.responsible_id}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-red-50 to-white px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                  Confirmación
                </p>
                <h2 className="text-lg font-bold text-gray-900">
                  Observaciones finales
                </h2>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                Tiempo estimado: 2 minutos
              </span>
            </div>

            <div className="space-y-1 p-4">
              <label className={labelClass} htmlFor="observaciones">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                required
                rows={4}
                placeholder="Información adicional relevante"
                className={`${inputClass} resize-none`}
                value={values.observaciones}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.observaciones)}
                aria-describedby="observaciones_error"
              />
              {fieldErrors.observaciones && (
                <p id="observaciones_error" className="text-xs font-semibold text-red-600">
                  {fieldErrors.observaciones}
                </p>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">
                Revisa la información antes de enviar.
              </p>
              <p>Todos los datos son confidenciales y se usarán solo para la reserva.</p>
            </div>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300 sm:w-auto"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar formulario"}
            </button>
          </div>

          {msg && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {msg}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
