import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { emblemSvg, lockupSvg, sunSvg } from "../generated/logo";

const ART = { emblem: emblemSvg, lockup: lockupSvg, sun: sunSvg };

/** True once the brand SVGs have been built in (scripts/build_logo.mjs). */
export const hasLogo = (kind: keyof typeof ART = "lockup") => ART[kind].length > 0;

/** The Ameesi logo, drawn from the brand SVG. `width` sets the size; the height follows the artwork. */
export function Logo({ kind = "lockup", width, label = "Ameesi" }: {
  kind?: keyof typeof ART; width: number; label?: string;
}) {
  const xml = ART[kind];
  if (!xml) return null;
  const box = xml.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  const ratio = box ? Number(box[2]) / Number(box[1]) : 1;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID={`logo-${kind}`}
      style={{ width, height: width * ratio }}>
      <SvgXml xml={xml} width={width} height={width * ratio} />
    </View>
  );
}
