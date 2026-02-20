// matches the settings.toml

export interface PDSConfig {
  host: string;
  emails: string[];
  pdsAdminPassword: string;
}

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
  pds: Record<LabelAction, PDSConfig>;
}
