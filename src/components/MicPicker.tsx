import { useCallback, useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { NBBadge } from "@/components/nb";
import { looksLikeMiclessSpeaker } from "@/lib/capture-gain";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "shiftedtone:micDeviceId";

/** The user's saved mic choice, or null for the browser default. */
export function getSavedMicDeviceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface MicDeviceInfo {
  deviceId: string;
  label: string;
}

/**
 * Mic input selector for the capture pages.
 *
 * Device labels only appear once the site holds mic permission, so the
 * list populates after the first granted take; before that it offers a
 * single "Default" entry. The choice persists and is passed into
 * capture.start() as an exact deviceId constraint.
 */
export function MicPicker({
  activeLabel,
  className,
}: {
  /** Label of the device the last take actually used ("" if none yet). */
  activeLabel: string;
  className?: string;
}) {
  const [devices, setDevices] = useState<MicDeviceInfo[]>([]);
  const [selected, setSelected] = useState<string>(
    () => getSavedMicDeviceId() ?? "",
  );

  const choose = (deviceId: string) => {
    setSelected(deviceId);
    try {
      if (deviceId) localStorage.setItem(STORAGE_KEY, deviceId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // persistence is best-effort
    }
  };

  const enumerate = useCallback(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((all) => {
        const nextDevices = all
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 5)}…`,
          }));
        setDevices(nextDevices);
        if (
          selected &&
          nextDevices.length > 0 &&
          !nextDevices.some((d) => d.deviceId === selected)
        ) {
          choose("");
        }
      })
      .catch(() => {});
  }, [selected]);

  useEffect(() => {
    enumerate();
    // Devices plug in and out; refresh while the picker is mounted.
    navigator.mediaDevices?.addEventListener?.("devicechange", enumerate);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", enumerate);
    };
  }, [enumerate]);

  if (devices.length === 0 && !activeLabel) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <NBBadge className="bg-paper">
        <Mic className="size-3" /> Mic
      </NBBadge>
      <select
        value={selected}
        onChange={(e) => choose(e.target.value)}
        className="nb max-w-[220px] bg-card px-2 py-1.5 text-xs font-bold"
        aria-label="Microphone input"
      >
        <option value="">Default input</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
      {activeLabel && (
        <span className="max-w-[220px] truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Last used: {activeLabel}
        </span>
      )}
      {activeLabel && looksLikeMiclessSpeaker(activeLabel) && (
        <p className="nb w-full bg-sun px-2.5 py-2 text-xs font-medium">
          “{activeLabel}” looks like a Bluetooth speaker — most can't record.
          If the next take comes back empty, power the speaker off or switch
          your phone's audio output back to the phone, then record.
        </p>
      )}
    </div>
  );
}
