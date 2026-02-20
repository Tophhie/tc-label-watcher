// matches the settings.toml

export type LabelAction = "notify" | "takedown";

export interface LabelConfig {
  label_name: string;
  action: LabelAction;
}

export interface LabelerConfig {
  host: string;
  labels: Record<string, LabelConfig>;
}

export interface Settings {
  "label-watcher": {
    settings: {
      pds: string[];
    };
  };
  labeler: Record<string, LabelerConfig>;
}
