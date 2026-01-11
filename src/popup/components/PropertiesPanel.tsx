import {
  AlignLeft,
  List,
  Calendar,
  Clock,
  Hash,
  CheckSquare,
  Link,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { ResolvedProperty } from "../../utils/properties";
import type { PropertyType } from "../../types/settings";

interface PropertiesPanelProps {
  properties: ResolvedProperty[];
  onPropertiesChange: (properties: ResolvedProperty[]) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

// Get icon for property type
function PropertyIcon({ type }: { type: PropertyType }) {
  const className = "w-3.5 h-3.5";
  switch (type) {
    case "text":
      return <AlignLeft className={className} />;
    case "number":
      return <Hash className={className} />;
    case "date":
      return <Calendar className={className} />;
    case "datetime":
      return <Clock className={className} />;
    case "checkbox":
      return <CheckSquare className={className} />;
    case "url":
      return <Link className={className} />;
    case "list":
      return <List className={className} />;
    default:
      return <AlignLeft className={className} />;
  }
}

// Get placeholder based on property type
function getPlaceholder(type: PropertyType, name: string): string {
  switch (type) {
    case "date":
      return "YYYY-MM-DD";
    case "datetime":
      return "YYYY-MM-DDTHH:mm:ss";
    case "number":
      return "0";
    case "checkbox":
      return "true/false";
    case "url":
      return "https://...";
    case "list":
      return "item1, item2, item3...";
    default:
      return `Enter ${name}...`;
  }
}

export default function PropertiesPanel({
  properties,
  onPropertiesChange,
  expanded,
  onToggleExpanded,
}: PropertiesPanelProps) {
  const handlePropertyChange = (id: string, value: string) => {
    const updated = properties.map((prop) =>
      prop.id === id ? { ...prop, value } : prop,
    );
    onPropertiesChange(updated);
  };

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="mx-2 px-2 py-2 rounded bg-secondary">
      <button
        onClick={onToggleExpanded}
        className="flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary w-full"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>Properties ({properties.length})</span>
      </button>
      {expanded && (
        <div className="mt-2 overflow-x-hidden">
          <ScrollArea.Root className="w-full overflow-x-hidden" style={{ height: "120px" }}>
            <ScrollArea.Viewport className="w-full h-full overflow-x-hidden">
              <div className="space-y-1.5 text-xs pr-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0 min-w-0">
                      <PropertyIcon type={prop.type} />
                      <span className="truncate" title={prop.name}>
                        {prop.name}
                      </span>
                    </div>
                    <input
                      type={prop.type === "number" ? "number" : "text"}
                      value={prop.value || ""}
                      onChange={(e) =>
                        handlePropertyChange(prop.id, e.target.value)
                      }
                      placeholder={getPlaceholder(prop.type, prop.name)}
                      className="flex-1 min-w-0 text-xs px-1.5 py-1 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-150 ease-out hover:bg-gray-100 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="flex-1 bg-gray-400 rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner />
          </ScrollArea.Root>
        </div>
      )}
    </div>
  );
}
