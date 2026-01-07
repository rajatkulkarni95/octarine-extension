import {
  AlignLeft,
  List,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { PageMetadata } from "../../types";

interface PropertiesPanelProps {
  metadata: PageMetadata;
  onMetadataChange: (metadata: PageMetadata) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function PropertiesPanel({
  metadata,
  onMetadataChange,
  expanded,
  onToggleExpanded,
}: PropertiesPanelProps) {
  return (
    <div className="mx-2 px-2 py-2 mt-2 rounded bg-secondary">
      <button
        onClick={onToggleExpanded}
        className="flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary w-full"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>Properties</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-1.5 text-xs">
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <AlignLeft className="w-3.5 h-3.5" />
              <span>title</span>
            </div>
            <input
              type="text"
              value={metadata.title || ""}
              onChange={(e) =>
                onMetadataChange({ ...metadata, title: e.target.value })
              }
              placeholder="Enter title..."
              className="flex-1 text-xs px-1.5 py-1 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>

          {/* Source */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <AlignLeft className="w-3.5 h-3.5" />
              <span>source</span>
            </div>
            <input
              type="text"
              value={metadata.source || ""}
              onChange={(e) =>
                onMetadataChange({ ...metadata, source: e.target.value })
              }
              placeholder="Enter source URL..."
              className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>

          {/* Author */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <List className="w-3.5 h-3.5" />
              <span>author</span>
            </div>
            <input
              type="text"
              value={metadata.author || ""}
              onChange={(e) =>
                onMetadataChange({ ...metadata, author: e.target.value })
              }
              placeholder="Enter author..."
              className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>published</span>
            </div>
            <input
              type="text"
              value={metadata.published || ""}
              onChange={(e) =>
                onMetadataChange({ ...metadata, published: e.target.value })
              }
              placeholder="YYYY-MM-DD"
              className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>

          {/* Description */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <AlignLeft className="w-3.5 h-3.5" />
              <span>description</span>
            </div>
            <input
              type="text"
              value={metadata.description || ""}
              onChange={(e) =>
                onMetadataChange({ ...metadata, description: e.target.value })
              }
              placeholder="Enter description..."
              className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
              <List className="w-3.5 h-3.5" />
              <span>tags</span>
            </div>
            <input
              type="text"
              value={metadata.tags?.join(", ") || ""}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="tag1, tag2, tag3..."
              className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
