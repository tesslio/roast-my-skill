"use client";

interface SkillFile {
  path: string;
  url: string;
}

interface SkillFilePickerProps {
  files: SkillFile[];
  onPick: (url: string) => void;
}

export default function SkillFilePicker({ files, onPick }: SkillFilePickerProps) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text)" }}
        >
          Multiple skills found
        </p>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          This repo has {files.length} skill files — pick one to roast
        </p>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => onPick(file.url)}
            className="group flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors hover:bg-[var(--bg-surface)]"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              /
            </span>
            <span
              className="flex-1 text-sm"
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              {file.path}
            </span>
            <span
              className="text-xs uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              Roast this
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
