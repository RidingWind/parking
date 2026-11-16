import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ParkingLot } from '@shared/api.interface';
import { PARKING_TYPE_LABELS, PARKING_TAG_LABELS } from '@shared/api.interface';

interface ParkingCardProps {
  parking: ParkingLot;
  distance?: number;
}

const tagColors: Record<string, string> = {
  free: 'bg-green-100 text-green-700 border-green-200',
  points: 'bg-blue-100 text-blue-700 border-blue-200',
  consumption: 'bg-orange-100 text-orange-700 border-orange-200',
  charging: 'bg-purple-100 text-purple-700 border-purple-200',
  holiday: 'bg-pink-100 text-pink-700 border-pink-200',
  pr: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

function getSummary(parking: ParkingLot): string {
  if (parking.freePolicy) return parking.freePolicy;
  if (parking.pointsRule) return parking.pointsRule;
  if (parking.consumptionRule) return parking.consumptionRule;
  if (parking.chargingRule) return parking.chargingRule;
  if (parking.holidayRule) return parking.holidayRule;
  if (parking.feeStandard) return parking.feeStandard;
  return '查看详情';
}

const ParkingCard = ({ parking, distance }: ParkingCardProps) => {
  const summary = getSummary(parking);
  const displayTags = parking.tags.slice(0, 3);

  return (
    <Link
      to={`/detail/${parking.id}`}
      className="block bg-card rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm leading-tight flex-1 line-clamp-1">
          {parking.name}
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
          {PARKING_TYPE_LABELS[parking.type as keyof typeof PARKING_TYPE_LABELS] || parking.type}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <MapPin size={12} className="shrink-0" />
        <span className="line-clamp-1">
          {parking.district}
          {parking.address ? ` · ${parking.address}` : ''}
        </span>
        {distance !== undefined && (
          <span className="ml-auto text-primary font-medium shrink-0">
            {distance < 1
              ? `${(distance * 1000).toFixed(0)}m`
              : `${distance.toFixed(1)}km`}
          </span>
        )}
      </div>

      <p className="text-xs text-foreground/80 line-clamp-2 mb-2 min-h-[32px]">
        {summary}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {displayTags.map((tag: string) => (
            <span
              key={tag}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                tagColors[tag] || 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {PARKING_TAG_LABELS[tag as keyof typeof PARKING_TAG_LABELS] || tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-0.5 text-xs">
          <Star
            size={12}
            className={parking.avgRating > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}
          />
          <span className={parking.avgRating > 0 ? 'text-foreground' : 'text-muted-foreground'}>
            {parking.avgRating > 0 ? parking.avgRating.toFixed(1) : '暂无'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ParkingCard;
