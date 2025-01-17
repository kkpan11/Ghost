import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';

interface Props {
    title?: string;
    children?: React.ReactNode;
}

const SettingSection: React.FC<Props> = ({title, children}) => {
    return (
        <div className="!visible hidden [&:has(>div>:not(.hidden))]:!block">
            {title && <SettingSectionHeader sticky={true} title={title} />}
            {children &&
                <div className="mb-[100px] flex flex-col gap-9">
                    {children}
                </div>
            }
        </div>
    );
};

export default SettingSection;
