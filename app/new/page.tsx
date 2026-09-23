import type { Metadata } from "next";
import { CreateForm } from "@/components/CreateForm";

export const metadata: Metadata = { title: "Новая петиция" };

export default function NewPetitionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Новая петиция</h1>
        <p className="mt-1 text-[14px] text-mute">
          Расскажите, что произошло. Чем конкретнее время, места и цифры, тем сложнее организаторам отмахнуться.
        </p>
      </div>
      <CreateForm />
    </div>
  );
}
