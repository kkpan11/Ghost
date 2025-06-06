import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import World from '@svg-maps/world';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Flag, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPages, SimplePaginationPreviousButton, cn, formatNumber, formatPercentage, formatQueryDate, getRangeDates, useSimplePagination} from '@tryghost/shade';
import {STATS_LABEL_MAPPINGS} from '@src/utils/constants';
import {SVGMap} from 'react-svg-map';
import {ReactComponent as SkullAndBones} from '@src/assets/icons/skull-and-bones.svg';
import {getPeriodText} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

// Array of values that represent unknown locations
const UNKNOWN_LOCATIONS = ['NULL', 'ᴺᵁᴸᴸ', ''];

// Normalize country code for flag display
const normalizeCountryCode = (code: string): string => {
    // Common mappings for countries that might come through with full names
    const mappings: Record<string, string> = {
        'UNITED STATES': 'US',
        'UNITED STATES OF AMERICA': 'US',
        USA: 'US',
        'UNITED KINGDOM': 'GB',
        UK: 'GB',
        'GREAT BRITAIN': 'GB',
        NETHERLANDS: 'NL'
    };

    const upperCode = code.toUpperCase();
    return mappings[upperCode] || (code.length > 2 ? code.substring(0, 2) : code);
};

interface TooltipData {
    countryCode: string;
    countryName: string;
    visits: number;
    x: number;
    y: number;
}

interface LocationData {
    location: string;
    visits: string;
    percentage: number;
}

interface TransformedLocationData extends LocationData {
    relativeValue: number;
}

const Locations:React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const ITEMS_PER_PAGE = 10;

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_locations'),
        token: getToken(statsConfig),
        params
    });

    const sortedData = useMemo(() => {
        if (!data) {
            return null;
        }

        const typedData = data as unknown as Array<{location: string; visits: string}>;

        // Separate known and unknown locations
        const knownLocations = typedData.filter(item => !UNKNOWN_LOCATIONS.includes(item.location));
        const unknownLocations = typedData.filter(item => UNKNOWN_LOCATIONS.includes(item.location));

        // Calculate total visits (excluding unknown locations)
        const totalVisits = knownLocations.reduce((sum, item) => sum + Number(item.visits), 0);

        // Calculate total unknown visits
        const totalUnknownVisits = unknownLocations.reduce((sum, item) => sum + Number(item.visits), 0);

        // Create combined unknown location record if there are any unknown locations
        const combinedUnknownRecord = totalUnknownVisits > 0 ? [{
            location: 'ᴺᵁᴸᴸ',
            visits: totalUnknownVisits.toString(),
            percentage: 0
        }] : [];

        // Add percentage to known locations and combine with unknown
        return [
            ...knownLocations.map(item => ({
                ...item,
                percentage: Number(item.visits) / totalVisits
            })),
            ...combinedUnknownRecord
        ].sort((a, b) => {
            if (UNKNOWN_LOCATIONS.includes(a.location)) {
                return 1;
            }
            if (UNKNOWN_LOCATIONS.includes(b.location)) {
                return -1;
            }
            return 0;
        });
    }, [data]);

    const isLoading = isConfigLoading || loading;

    const transformData = (rawData: LocationData[] | null): Record<string, TransformedLocationData> => {
        if (!rawData) {
            return {};
        }

        // Filter out unknown location entries for calculations
        const validData = rawData.filter(item => !UNKNOWN_LOCATIONS.includes(item.location));

        // Find the maximum number of visits
        const maxVisits = validData.reduce((max, item) => Math.max(max, Number(item.visits)), 0);

        // Transform all data into an object with location codes as keys
        return rawData.reduce((acc, item) => {
            if (UNKNOWN_LOCATIONS.includes(item.location)) {
                // Skip individual unknown locations as they're combined in the sortedData
                return acc;
            }

            // Calculate percentage relative to max visits
            const percentage = (Number(item.visits) / maxVisits) * 100;
            // Map percentage to 10-100 scale in increments of 10
            const relativeValue = Math.min(100, Math.max(10, Math.ceil(percentage / 10) * 10));

            acc[item.location] = {
                ...item,
                relativeValue
            };

            return acc;
        }, {} as Record<string, TransformedLocationData>);
    };

    const transformedData = transformData(sortedData as LocationData[] | null);

    const getLocationClassName = (location: {id: string, name: string}) => {
        const countryCode = location.id.toUpperCase();
        const currentData = transformedData[countryCode];
        if (currentData) {
            let opacity = '';

            // We have to do this manually because dynamic classnames are not interpreted by TailwindCSS
            switch (currentData.relativeValue) {
            case 10:
                opacity = 'opacity-10';
                break;
            case 20:
                opacity = 'opacity-20';
                break;
            case 30:
                opacity = 'opacity-30';
                break;
            case 40:
                opacity = 'opacity-40';
                break;
            case 50:
                opacity = 'opacity-50';
                break;
            case 60:
                opacity = 'opacity-60';
                break;
            case 70:
                opacity = 'opacity-70';
                break;
            case 80:
                opacity = 'opacity-80';
                break;
            case 90:
                opacity = 'opacity-90';
                break;
            }
            return cn('fill-[hsl(var(--chart-1))]', opacity);
        }

        return 'fill-gray-300 dark:fill-gray-900/75';
    };

    const handleLocationMouseOver = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        const countryCode = target.getAttribute('id')?.toUpperCase() || '';
        const countryData = transformedData[countryCode];

        target.style.opacity = '0.75';

        setTooltipData({
            countryCode,
            countryName: getCountryName(countryCode),
            visits: countryData ? Number(countryData.visits) : 0,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleLocationMouseOut = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        target.style.opacity = '';
        setTooltipData(null);
    };

    const {
        currentPage,
        totalPages,
        paginatedData: tableData,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: sortedData,
        itemsPerPage: ITEMS_PER_PAGE
    });

    return (
        <StatsLayout>
            <StatsHeader>
                <AudienceSelect />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={data} isLoading={isLoading}>
                <Card className='p-0'>
                    <CardHeader className='border-b'>
                        <CardTitle>Top Locations</CardTitle>
                        <CardDescription>A geographic breakdown of your readers {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <div className='grid grid-cols-3 items-stretch'>
                            <div className='svg-map-container relative col-span-2 mx-auto w-full max-w-[740px] px-8 py-12 [&_.svg-map]:stroke-background'>
                                <SVGMap
                                    locationClassName={getLocationClassName}
                                    map={World}
                                    onLocationMouseOut={handleLocationMouseOut}
                                    onLocationMouseOver={handleLocationMouseOver}
                                />
                                {tooltipData && (
                                    <div
                                        className="pointer-events-none fixed z-50 min-w-[120px] rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-lg transition-all duration-150 ease-in-out"
                                        style={{
                                            left: tooltipData.x + 10,
                                            top: tooltipData.y + 10,
                                            transform: 'translate3d(0, 0, 0)'
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Flag countryCode={`${normalizeCountryCode(tooltipData.countryCode)}`} height='12px' width='20px' />
                                            <span className="font-medium">{tooltipData.countryName}</span>
                                        </div>
                                        <div className='mt-1 flex grow items-center justify-between gap-3'>
                                            <div className="text-sm text-muted-foreground">Visitors</div>
                                            <div className="font-mono font-medium">{formatNumber(tooltipData.visits)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className='group/datalist flex flex-col justify-between border-l px-6'>
                                <DataList>
                                    <DataListHeader className='py-4'>
                                        <DataListHead>Source</DataListHead>
                                        <DataListHead>Visitors</DataListHead>
                                    </DataListHeader>
                                    <DataListBody>
                                        {tableData?.map((row) => {
                                            const countryName = getCountryName(`${row.location}`) || 'Unknown';
                                            return (
                                                <DataListRow key={row.location || 'unknown'}>
                                                    <DataListBar className='opacity-15 transition-all group-hover/row:opacity-30' style={{
                                                        width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`,
                                                        backgroundColor: 'hsl(var(--chart-blue))'
                                                    }} />
                                                    <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                                        <div className='flex items-center space-x-4 overflow-hidden'>
                                                            <Flag
                                                                countryCode={`${normalizeCountryCode(row.location as string)}`}
                                                                fallback={
                                                                    <span className='flex h-[14px] w-[22px] items-center justify-center rounded-[2px] bg-black text-white'>
                                                                        <SkullAndBones className="size-3" />
                                                                    </span>
                                                                }
                                                            />
                                                            <div className='truncate font-medium'>{countryName}</div>
                                                        </div>
                                                    </DataListItemContent>
                                                    <DataListItemValue>
                                                        <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                                        {!UNKNOWN_LOCATIONS.includes(row.location) &&
                                                            <DataListItemValuePerc>{formatPercentage(row.percentage)}</DataListItemValuePerc>
                                                        }
                                                    </DataListItemValue>
                                                </DataListRow>
                                            );
                                        })}
                                    </DataListBody>
                                </DataList>
                                <SimplePagination className='mt-5'>
                                    <SimplePaginationPages currentPage={currentPage.toString()} totalPages={totalPages.toString()} />
                                    <SimplePaginationNavigation>
                                        <SimplePaginationPreviousButton
                                            disabled={!hasPreviousPage}
                                            onClick={previousPage}
                                        />
                                        <SimplePaginationNextButton
                                            disabled={!hasNextPage}
                                            onClick={nextPage}
                                        />
                                    </SimplePaginationNavigation>
                                </SimplePagination>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Locations;
