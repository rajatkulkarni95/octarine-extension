import { useState } from "react";
import {
  AlignLeft,
  List,
  Calendar,
  Clock,
  Hash,
  CheckSquare,
  X,
  Plus,
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { ResolvedProperty } from "../../utils/properties";
import type { PropertyType } from "../../types/settings";

interface ContentPropertiesTabsProps {
  content: string;
  onContentChange: (content: string) => void;
  properties: ResolvedProperty[];
  onPropertiesChange: (properties: ResolvedProperty[]) => void;
  propertiesEnabled: boolean;
}

type TabType = "content" | "properties";

// Get icon for property type
function PropertyIcon({ type }: { type: PropertyType }) {
  const className = "w-3.5 h-3.5";
  switch (type) {
    case "string":
      return <AlignLeft className={className} />;
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
    case "list":
    case "tags":
      return "item1, item2, item3...";
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
  const [activeTab, setActiveTab] = useState<TabType>("content");

  const handlePropertyChange = (id: string, value: string) => {
    const updated = properties.map((prop) =>
      prop.id === id ? { ...prop, value } : prop,
    );
    onPropertiesChange(updated);
  };

  const handlePropertyNameChange = (id: string, name: string) => {
    const updated = properties.map((prop) =>
      prop.id === id ? { ...prop, name } : prop,
    );
    onPropertiesChange(updated);
  };

  const handlePropertyTypeChange = (id: string, type: PropertyType) => {
    const updated = properties.map((prop) =>
      prop.id === id ? { ...prop, type } : prop,
    );
    onPropertiesChange(updated);
  };

  const handleAddProperty = () => {
    const newProperty: ResolvedProperty = {
      id: `custom-${Date.now()}`,
      name: "New Property",
      type: "string",
      value: "",
    };
    onPropertiesChange([...properties, newProperty]);
  };

  const handleRemoveProperty = (id: string) => {
    const updated = properties.filter((prop) => prop.id !== id);
    onPropertiesChange(updated);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-secondary px-2">
        <button
          onClick={() => setActiveTab("content")}
          className={`px-3 py-2 text-[13px] font-medium transition-colors ${
            activeTab === "content"
              ? "text-primary border-b-2 border-accent -mb-px"
              : "text-tertiary hover:text-secondary"
          }`}
        >
          Content
        </button>
        {propertiesEnabled && (
          <button
            onClick={() => setActiveTab("properties")}
            className={`px-3 py-2 text-[13px] font-medium transition-colors ${
              activeTab === "properties"
                ? "text-primary border-b-2 border-accent -mb-px"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            Properties {properties.length > 0 && `(${properties.length})`}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "content" && (
          <div className="h-full px-2 py-2">
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full h-full resize-none text-[13px] text-secondary font-mono bg-intermediate border border-primary rounded p-2 focus:outline-none focus:border-accent"
              placeholder="Preview content..."
            />
          </div>
        )}

        {activeTab === "properties" && (
          <div className="h-full px-2 py-2 flex flex-col">
            <ScrollArea.Root className="flex-1 w-full overflow-x-hidden">
              <ScrollArea.Viewport className="w-full h-full overflow-x-hidden">
                <div className="space-y-1.5 text-xs pr-4 pb-2">
                  {properties.map((prop) => (
                    <div
                      key={prop.id}
                      className="flex items-center gap-2 min-w-0"
                    >
                      {/* Type selector as icon */}
                      <div className="relative shrink-0">
                        <select
                          value={prop.type}
                          onChange={(e) =>
                            handlePropertyTypeChange(
                              prop.id,
                              e.target.value as PropertyType,
                            )
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Change type"
                        >
                          <option value="string">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="datetime">DateTime</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="list">List</option>
                          <option value="tags">Tags</option>
                        </select>
                        <div className="pointer-events-none text-placeholder">
                          <PropertyIcon type={prop.type} />
                        </div>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={prop.name}
                        onChange={(e) =>
                          handlePropertyNameChange(prop.id, e.target.value)
                        }
                        placeholder="name"
                        className="w-24 shrink-0 text-xs px-1.5 py-1 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-placeholder placeholder:text-placeholder focus:outline-none focus:bg-secondary"
                      />

                      {/* Value input */}
                      <input
                        type={prop.type === "number" ? "number" : "text"}
                        value={prop.value || ""}
                        onChange={(e) =>
                          handlePropertyChange(prop.id, e.target.value)
                        }
                        placeholder={getPlaceholder(prop.type, prop.name)}
                        className="flex-1 min-w-0 text-xs px-1.5 py-1 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary mr-2"
                      />

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveProperty(prop.id)}
                        className="shrink-0 text-placeholder hover:text-red-500 transition-colors p-0.5 ml-auto"
                        title="Remove property"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
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

            {/* Add Property Button */}
            <div className="pt-2 mt-2">
              <button
                onClick={handleAddProperty}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-tertiary hover:text-secondary hover:bg-secondary border border-transparent hover:border-secondary rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Property
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
