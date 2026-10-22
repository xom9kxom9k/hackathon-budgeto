import { HorizontalTab, HorizontalTabs } from '@admiral-ds/react-ui';

interface DetailTabsProps {
  activeTab: string;
  labels: Record<string, string>;
  onChange: (tab: string) => void;
  tabs: string[];
}

export function DetailTabs({ activeTab, labels, onChange, tabs }: DetailTabsProps) {
  return (
    <HorizontalTabs
      dimension="m"
      renderTab={(tabId, selected, onSelectTab) => (
        <HorizontalTab
          onSelectTab={() => {
            onSelectTab?.(tabId);
            onChange(tabId);
          }}
          selected={selected}
          tabId={tabId}
        >
          {labels[tabId]}
        </HorizontalTab>
      )}
      selectedTabId={activeTab}
      tabIsDisabled={() => false}
      tabsId={tabs}
    />
  );
}
