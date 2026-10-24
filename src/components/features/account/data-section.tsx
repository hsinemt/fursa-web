"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/features/auth/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ErrorPanel } from "@/components/ui/error-panel";
import { useToast } from "@/components/ui/toast";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useDescribeError } from "@/hooks/use-describe-error";
import { useDeleteAccount, useExportData } from "@/lib/account/hooks";
import { confirmsDeletion, DELETE_WORD, downloadJson, exportFileName } from "@/lib/account/values";
import { accountDeletedAction } from "@/lib/auth/actions";

function DeleteDialog() {
  const t = useTranslations("settings.data");
  const describe = useDescribeError();
  const handle = useApiErrorHandler();
  const remove = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<unknown>(null);
  const described = error ? describe(error) : null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmsDeletion(typed) || remove.isPending) return;
    setError(null);
    remove.mutate(undefined, {
      // The account is gone: end the session on the server and go to the login page.
      onSuccess: () => void accountDeletedAction(),
      onError: (failure) => {
        setError(failure);
        void handle(failure);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">{t("delete")}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>{t("deleteTitle")}</DialogTitle>
        <DialogDescription>{t("deleteWhat")}</DialogDescription>
        <p className="mt-2 text-base font-medium text-ink">{t("deleteIrreversible")}</p>
        <p className="mt-2 text-sm text-slate">{t("deleteProvider")}</p>
        <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <Field
            label={t("typeToConfirm", { word: DELETE_WORD })}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          {described ? <ErrorPanel message={described.message} code={described.code} /> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive-solid"
              disabled={!confirmsDeletion(typed) || remove.isPending}
            >
              {t("deleteConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The "Your data" group: download everything as a file, or delete the account. */
export function DataSection() {
  const t = useTranslations("settings.data");
  const toast = useToast();
  const describe = useDescribeError();
  const handle = useApiErrorHandler();
  const exportData = useExportData();
  const [error, setError] = useState<unknown>(null);
  const described = error ? describe(error) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          disabled={exportData.isPending}
          onClick={() => {
            setError(null);
            exportData.mutate(undefined, {
              onSuccess: (data) => {
                downloadJson(data, exportFileName(new Date()));
                toast.show(t("downloaded"));
              },
              onError: (failure) => {
                setError(failure);
                void handle(failure);
              },
            });
          }}
        >
          {exportData.isPending ? t("preparing") : t("download")}
        </Button>
        <p className="mt-2 text-sm text-slate">{t("downloadNote")}</p>
        {described ? (
          <ErrorPanel className="mt-3" message={described.message} code={described.code} />
        ) : null}
      </div>
      <div>
        <DeleteDialog />
        <p className="mt-2 text-sm text-slate">{t("deleteNote")}</p>
      </div>
    </div>
  );
}
