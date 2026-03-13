"use client";

import CompanyHeader from "./CompanyHeader";
import RouteListItem from "./RouteListItem";

type Props = {
  companyKey: string;
  companyName: string;
  items: {
    id: string;
    companyKey: string;
    companyName: string;
    tableName?: string;
    color: string;
  }[],
  selectedIds: Set<string>;
  onChangeCompany: (checked: boolean) => void;
  onChangeRoute: (checked: boolean, id: string) => void;
};

export default function CompanyListItem({ companyKey, companyName, items, selectedIds, onChangeCompany, onChangeRoute }: Props) {
  let selectedItemCount = 0;
  items.forEach(v => {
    if (selectedIds.has(v.id)) selectedItemCount++;
  });

  if (items.length === 1) {
    const theTable = items[0];
    return (
      <RouteListItem
        checked={selectedIds.has(theTable.id)}
        onChange={(checked) => onChangeRoute(checked, theTable.id)}
        color={theTable.color}
        name={theTable.tableName !== undefined ? `${companyName} ${theTable.tableName}` : companyName}
      />
    );
  } else {
    return (
      <div>
        <CompanyHeader
          companyKey={companyKey}
          companyName={companyName}
          selectedItemCount={selectedItemCount}
          allItemCount={items.length}
          onChange={onChangeCompany}
        />

        <div className="mt-2 ml-3 flex flex-col">
          {items.map((s, idx) => {
            const isLast = idx === items.length - 1;
            const vLineClass = isLast ? "-top-2 bottom-[calc(50%-1px)]" : "-top-2 bottom-0";

            return (
              <div
                key={s.id}
                className={"relative flex" + (isLast ? "" : " pb-2")}
              >
                <div aria-hidden="true" className="relative w-4 flex-none">
                  <span
                    className={
                      "absolute left-1/2 w-px -translate-x-1/2 bg-zinc-200 " +
                      vLineClass
                    }
                  />
                  <span className="absolute left-1/2 h-px w-2 bg-zinc-200 top-1/2 bottom-1/2"/>
                </div>

                <RouteListItem
                  checked={selectedIds.has(s.id)}
                  onChange={(checked) => onChangeRoute(checked, s.id)}
                  color={s.color}
                  name={s.tableName!}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
