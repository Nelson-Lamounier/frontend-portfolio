import type { ReactNode } from "react"




export function MultiColumnLayout({ children, secondaryColumn }: { children: ReactNode, secondaryColumn?: ReactNode }) {
    return (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
            <div className="flex-1 w-full min-w-0">
                {children}
            </div>
            {secondaryColumn && (
                <aside className="w-full xl:w-96 shrink-0 border-t xl:border-t-0 xl:border-l border-white/10 pt-8 xl:pt-0 xl:pl-8">
                    {secondaryColumn}
                </aside>
            )}
        </div>
    )
}