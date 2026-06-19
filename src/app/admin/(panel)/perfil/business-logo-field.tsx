"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const acceptedLogoTypes = "image/png,image/jpeg,image/webp";
const maxLogoSizeBytes = 2 * 1024 * 1024;
const allowedLogoTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export function BusinessLogoField({
  defaultValue,
  defaultLogoUrl
}: {
  defaultValue: string;
  defaultLogoUrl: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [fileError, setFileError] = useState("");
  const hasUploadedLogo = defaultValue.startsWith("data:");
  const previewUrl = removeLogo ? defaultLogoUrl : localPreviewUrl || defaultValue || defaultLogoUrl;

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedLogoTypes.has(file.type)) {
      setFileError("Use apenas PNG, JPG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > maxLogoSizeBytes) {
      setFileError("Logo muito grande. Envie uma imagem com ate 2 MB.");
      event.target.value = "";
      return;
    }

    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setRemoveLogo(false);
    setFileError("");
  }

  function handleRemoveLogo() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl("");
    setRemoveLogo(true);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRestoreCurrent() {
    setRemoveLogo(false);
    setFileError("");
  }

  return (
    <div className="space-y-3 lg:col-span-2">
      <input type="hidden" name="currentLogoUrl" value={defaultValue} />
      <input type="hidden" name="removeLogo" value={removeLogo ? "1" : "0"} />

      <div className="grid gap-3 rounded-[18px] border border-blue-100 bg-blue-50/40 p-3 sm:grid-cols-[96px_1fr]">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[18px] border border-blue-100 bg-white p-2">
          <img src={previewUrl} alt="Previa do logo" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#082F8B]">Logo publico</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            A imagem enviada sera ajustada automaticamente para caber na tela de agendamento sem cortar ou quebrar o layout.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-3 text-sm font-semibold text-white transition hover:bg-[#082F8B] focus-within:ring-2 focus-within:ring-[#0F5EF7] focus-within:ring-offset-2">
              <ImagePlus aria-hidden className="h-4 w-4" />
              Trocar logo
              <input ref={fileInputRef} name="logoFile" type="file" accept={acceptedLogoTypes} className="sr-only" onChange={handleFileChange} />
            </label>
            {removeLogo ? (
              <button
                type="button"
                onClick={handleRestoreCurrent}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-blue-100 bg-white px-3 text-sm font-semibold text-[#0F5EF7] transition hover:border-[#0F5EF7] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                Desfazer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-red-100 bg-white px-3 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Remover logo
              </button>
            )}
          </div>
          {fileError ? (
            <p className="mt-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {fileError}
            </p>
          ) : null}
        </div>
      </div>

      <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
        Link do logo
        <Input
          name="logoUrl"
          defaultValue={hasUploadedLogo ? "" : defaultValue}
          placeholder={hasUploadedLogo ? "Logo enviado por upload" : "/brand/logo-icon.png"}
          disabled={removeLogo}
        />
      </label>
      <p className="text-xs font-medium leading-5 text-slate-500">
        Upload aceito: PNG, JPG ou WebP com ate 2 MB. SVG enviado por cliente fica bloqueado por seguranca; para remover, o sistema volta ao logo padrao.
      </p>
    </div>
  );
}
