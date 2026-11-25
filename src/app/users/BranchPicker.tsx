type Branch = { id: string; name: string; code: string };

export function BranchPicker({ branches, selected, onChange, formFields = false }: {
  branches: Branch[];
  selected: string[];
  onChange: (ids: string[]) => void;
  formFields?: boolean;
}) {
  const all = selected[0] === '__ALL__';
  return (
    <fieldset className="rounded-xl border border-slate-300 p-3 dark:border-slate-700">
      <legend className="px-1 text-xs font-bold">สาขา (Branch)</legend>
      {formFields && <>
        <input type="hidden" name="branchId" value={selected[0] ?? ''}/>
        {selected.slice(1).map((id) => <input key={id} type="hidden" name="approvalBranchIds" value={id}/>)}
      </>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={all} onChange={(event) => onChange(event.target.checked ? ['__ALL__'] : [])}/>
        ทุกสาขา
      </label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {branches.map((branch) => (
          <label key={branch.id} className="flex flex-wrap items-center gap-2 text-sm">
            <input type="checkbox" disabled={all} checked={selected.includes(branch.id)}
              onChange={(event) => onChange(event.target.checked ? [...selected, branch.id] : selected.filter((id) => id !== branch.id))}/>
            {branch.name} ({branch.code})
            {selected[0] === branch.id && <span className="text-xs text-indigo-600 dark:text-indigo-300">สาขาหลัก</span>}
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">สาขาที่เลือกแรกเป็นสาขาหลัก สาขาอื่นใช้อนุมัติและตรวจสอบ Memo</p>
    </fieldset>
  );
}
