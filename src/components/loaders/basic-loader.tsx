import React from "react";
import basicLoaderStyles from "@/components/loaders/basic.module.css";

export default function BasicLoader({
  width,
  height,
}: {
  width: string;
  height: string;
}) {
  return (
    <span style={{ width, height }} className={basicLoaderStyles.loader}></span>
  );
}
