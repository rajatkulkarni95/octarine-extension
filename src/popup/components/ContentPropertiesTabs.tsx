import { useState } from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  List,
  Plus,
  X,
} from "lucide-react";
import type { ResolvedProperty } from "../../utils/properties";
import type { PropertyType } from "../../types/settings";

interface ContentPropertiesTabsProps {
  content: string;
  onContentChange: (content: string) => void;
  properties: ResolvedProperty[];
  onPropertiesChange: (properties: ResolvedProperty[]) => void;
  propertiesEnabled: boolean;
}

function PropertyIcon({ type }: { type: PropertyType }) {
  const className = "h-3.5 w-3.5";
  switch (type) {
    case "number":
      return <Hash className={className} />;
    case "date":
      return <Calendar className={className} />;
    case "datetime":
      return <Clock className={className} />;
    case "checkbox":
      return <CheckSquare className={className} />;
    case "list":
    case "tags":
      return <List className={className} />;
    default:
      return <AlignLeft className={className} />;
  }
}

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
    case "list":
    case "tags":
      return "item1, item2";
    default:
      return `Enter ${name}...`;
  }
}

export default function ContentPropertiesTabs({
  content,
  onContentChange,
  properties,
  onPropertiesChange,
  propertiesEnabled,
}: ContentPropertiesTabsProps) {
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);

  const updateProperty = (
    id: string,
    updates: Partial<Pick<ResolvedProperty, "name" | "type" | "value">>,
  ) => {
    onPropertiesChange(
      properties.map((property) =>
        property.id === id ? { ...property, ...updates } : property,
      ),
    );
  };

  const addProperty = () => {
    onPropertiesChange([
      ...properties,
      {
        id: `custom-${Date.now()}`,
        name: "New Property",
        type: "string",
        value: "",
      },
    ]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
      {propertiesEnabled && (
        <section className="mb-2 flex-shrink-0 overflow-hidden rounded-md border border-faded bg-intermediate">
          <button
            type="button"
            onClick={() => setPropertiesExpanded((expanded) => !expanded)}
            className="flex h-8 w-full items-center gap-1.5 px-2 text-left text-[12px] font-medium text-secondary hover:bg-hover"
            aria-expanded={propertiesExpanded}
          >
            {propertiesExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-placeholder" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-placeholder" />
            )}
            <span>Properties</span>
            <span className="font-normal text-placeholder">{properties.length}</span>
          </button>

          {propertiesExpanded && (
            <div className="max-h-[172px] overflow-y-auto border-t border-faded px-2 py-1">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="group flex min-h-7 items-center gap-1.5 border-b border-faded py-0.5 last:border-b-0"
                >
                  <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center text-placeholder">
                    <select
                      value={property.type}
                      onChange={(event) =>
                        updateProperty(property.id, {
                          type: event.target.value as PropertyType,
                        })
                      }
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label={`Type for ${property.name}`}
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="datetime">DateTime</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="list">List</option>
                      <option value="tags">Tags</option>
                    </select>
                    <PropertyIcon type={property.type} />
                  </div>

                  <input
                    value={property.name}
                    onChange={(event) =>
                      updateProperty(property.id, { name: event.target.value })
                    }
                    className="w-[36%] min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-tertiary hover:border-primary focus:border-secondary focus:bg-primary focus:outline-none"
                    aria-label="Property name"
                  />
                  <input
                    type={property.type === "number" ? "number" : "text"}
                    value={property.value}
                    onChange={(event) =>
                      updateProperty(property.id, { value: event.target.value })
                    }
                    placeholder={getPlaceholder(property.type, property.name)}
                    className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-primary placeholder:text-placeholder hover:border-primary focus:border-secondary focus:bg-primary focus:outline-none"
                    aria-label={`Value for ${property.name}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onPropertiesChange(
                        properties.filter(({ id }) => id !== property.id),
                      )
                    }
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-placeholder opacity-0 hover:bg-hover hover:text-error focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Remove ${property.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addProperty}
                className="mt-1 flex h-7 items-center gap-1.5 rounded px-1.5 text-[12px] text-tertiary hover:bg-hover hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add property
              </button>
            </div>
          )}
        </section>
      )}

      <label htmlFor="clip-content" className="mb-1 px-0.5 text-[11px] font-medium text-tertiary">
        Content
      </label>
      <textarea
        id="clip-content"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        className="min-h-0 flex-1 resize-none rounded-md border border-faded bg-intermediate p-2 text-[13px] leading-relaxed text-primary placeholder:text-placeholder hover:border-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder="Preview content..."
      />
    </div>
  );
}
