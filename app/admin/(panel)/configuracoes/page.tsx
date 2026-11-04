import { getSettings } from "@/lib/store";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsForm s={getSettings()} />;
}
