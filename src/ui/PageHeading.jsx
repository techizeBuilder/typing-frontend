import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';

export function Breadcrumbs({ crumbs }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-[12.5px]">
        {crumbs.map((c, i) =>
          <li key={c.label} className="flex items-center gap-1.5">
            {c.to ?
              <Link to={c.to} className="text-primary transition-colors duration-150 hover:text-primary-700">
                {c.label}
              </Link> :
              <span className="font-medium text-slate-600">{c.label}</span>
            }
            {i < crumbs.length - 1 && <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />}
          </li>
        )}
      </ol>
    </nav>
  );
}

export function PageHeading({ icon, title, subtitle, crumbs, crumbsRight = false, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-4">
      <div className="flex items-start gap-3">
        {icon &&
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary">
            {icon}
          </span>
        }
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-navy-800">{title}</h2>
          {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
          {crumbs && !crumbsRight &&
            <div className="mt-1">
              <Breadcrumbs crumbs={crumbs} />
            </div>
          }
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        {crumbs && crumbsRight && <Breadcrumbs crumbs={crumbs} />}
        {actions}
      </div>
    </div>
  );
}
