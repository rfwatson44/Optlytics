import React from "react";
import DateSelector from "./DateSelector";
import AddFilterButton from "./AddFilterButton";

export default function FiltersBar() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <DateSelector />
      <AddFilterButton />
    </div>
  );
}
