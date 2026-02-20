// matches the settings.toml

export interface PDSConfig {
  host: string;
  emails: string[];
  pdsAdminPassword: string;
  backfillAccounts: boolean;
  listenForNewAccounts: boolean;
}

export type LabelAction = "notify" | "takedown";

export interface LabelConfig {
  label_name: string;
  action: LabelAction;
}

export interface LabelerConfig {
  host: string;
  // If set to true and no previous cursor is found it starts from 0
  backfillLabels: boolean;
  labels: Record<string, LabelConfig>;
}

export interface Settings {
  "label-watcher": {
    settings: {
      pds: string[];
    };
  };
  labeler: Record<string, LabelerConfig>;
  pds: Record<string, PDSConfig>;
}
