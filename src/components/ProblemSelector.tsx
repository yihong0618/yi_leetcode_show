import type { ProblemDefinition } from "../types";

interface ProblemSelectorProps {
  problems: ProblemDefinition[];
  selectedId: string;
  onSelect: (nextId: string) => void;
}

export function ProblemSelector({
  problems,
  selectedId,
  onSelect
}: ProblemSelectorProps) {
  return (
    <div className="selector-card">
      <label className="selector-card__label" htmlFor="problem-select">
        当前题目
      </label>
      <select
        id="problem-select"
        className="selector-card__input"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {problems.map((problem) => (
          <option key={problem.id} value={problem.id}>
            {problem.title}
          </option>
        ))}
      </select>
    </div>
  );
}
