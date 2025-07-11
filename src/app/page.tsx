"use client";

import { useEffect, useState } from "react";
import { getCheapestShipping, ShippingData } from "@/lib/shipping";
import ExchangeRate from "./components/ExchangeRate";
import Result from "./components/Result";
import {
  calculateCategoryFee,
  // convertShippingPriceToJPY,
  calculateActualCost,
  calculateGrossProfit,
  calculateProfitMargin,
  calculateFinalProfitDetail,
} from "@/lib/profitCalc";

import { isUnder135GBP } from "@/lib/vatRule";
// import { calculateFinalProfitDetail } from "@/lib/profitCalc";
import FinalResult from "./components/FinalResult";


// ここから型定義を追加
type ShippingResult = {
  method: string;
  price: number | null;
};

type CategoryFeeType = {
  label: string;
  value: number;
  categories: string[];
};

type CalcResult = {
  shippingJPY: number,
  categoryFeeJPY: number;
  actualCost: number;
  grossProfit: number;
  profitMargin: number;
  method: string;
}


export default function Page() {
  // State管理
  const [shippingRates, setShippingRates] = useState<ShippingData | null>(null);
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [weight, setWeight] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({
    length: 0,
    width: 0,
    height: 0,
  });
  const [rate, setRate] = useState<number | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryFeeType[]>([]);
  const [selectedCategoryFee, setSelectedCategoryFee] = useState<number | "">(
    ""
  );
  const [result, setResult] = useState<ShippingResult | null>(null);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  // VATのStateを追加
  const [includeVAT, setIncludeVAT] = useState<boolean>(false);

  // 配送料データ読み込み
  useEffect(() => {
    fetch("/data/shipping.json")
      .then((res) => res.json())
      .then((data) => setShippingRates(data));
  }, []);

  // VAT判定専用
  useEffect(() => {
    if (sellingPrice !== "" && rate !== null) {
      const priceGBP =
        typeof sellingPrice === "number" ? sellingPrice / rate : 0;
      setIncludeVAT(isUnder135GBP(priceGBP));
    } else {
      setIncludeVAT(false);
    }
  }, [sellingPrice, rate]);


  // 計算結果用のuseEffect
  useEffect(() => {
    if (
      sellingPrice !== "" &&
      costPrice !== "" &&
      rate !== null &&
      weight !== null &&
      result !== null &&
      result.price !== null &&
      selectedCategoryFee !== ""
    ) {
      //配送料JPYに換算
      const shippingJPY = result.price ?? 0;


      //カテゴリ手数料JPY計算
      const categoryFeeJPY = calculateCategoryFee(
        typeof sellingPrice === "number" ? sellingPrice : 0,
        typeof selectedCategoryFee === "number" ? selectedCategoryFee : 0
      );

      //実費合計
      const actualCost = calculateActualCost(
        typeof costPrice === "number" ? costPrice : 0,
        shippingJPY,
        categoryFeeJPY
      );
      //粗利計算
      const grossProfit = calculateGrossProfit(
        typeof sellingPrice === "number" ? sellingPrice : 0,
        actualCost
      );
      //利益率計算
      const profitMargin = calculateProfitMargin(grossProfit,
        typeof sellingPrice === "number" ? sellingPrice : 0
      );

      setCalcResult({
        shippingJPY,
        categoryFeeJPY,
        actualCost,
        grossProfit,
        profitMargin,
        method: result.method,
      });

    }
  }, [sellingPrice, costPrice, rate, weight, result, selectedCategoryFee]);

  useEffect(() => {
    fetch("/data/categoryFees.json")
      .then((res) => res.json())
      .then((data) => setCategoryOptions(data));
  }, []);

  useEffect(() => {
    if (rate !== null) {
     console.log(`最新為替レート：${rate}`);
    }
  }, [rate]);

  useEffect(() => {
    if (shippingRates && weight !== null && weight > 0) {
      const cheapest = getCheapestShipping(shippingRates, weight, dimensions);
      setResult(cheapest);
    }
  }, [shippingRates, weight, dimensions]);

  const final = calcResult
    ? calculateFinalProfitDetail({
      sellingPrice: typeof sellingPrice === "number" ? sellingPrice : 0,
      costPrice: typeof costPrice === "number" ? costPrice : 0,
      shippingJPY: calcResult.shippingJPY,
      categoryFeeJPY: calcResult.categoryFeeJPY,
      customsRate: 4, // 関税率
      platformRate: 0, // 任意
      includeVAT: includeVAT, // 自動判定
      exchangeRateGBPtoJPY: rate ?? undefined,
    })
    : null;



  return (
    <div className="p-4 max-w-5xl mx-auto flex flex-col md:flex-row md:space-x-8 space-y-8 md:space-y-0">
      <div className="flex-1 flex flex-col space-y-4">
        {/* 為替レート表示コンポーネント */}
        <ExchangeRate onRateChange={setRate} />
        <div>
          <label className="block font-semibold mb-1">仕入れ値 (円) </label>
          <input
            type="number"
            value={costPrice}
            onChange={(e) =>
              setCostPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="仕入れ値"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">売値 (円) </label>
          <input
            type="number"
            value={sellingPrice}
            onChange={(e) =>
              setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="売値"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">実重量 (g) </label>
          <input
            type="number"
            value={weight ?? ""}
            onChange={(e) =>
              setWeight(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="実重量"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">サイズ (cm)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={dimensions.length || ""}
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  length: Number(e.target.value),
                }))
              }
              placeholder="長さ"
              className="px-2 py-1 border rounded-md"
            />
            <input
              type="number"
              value={dimensions.width || ""}
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  width: Number(e.target.value),
                }))
              }
              placeholder="幅"
              className="px-2 py-1 border rounded-md"
            />
            <input
              type="number"
              value={dimensions.height || ""}
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  height: Number(e.target.value),
                }))
              }
              placeholder="高さ"
              className="px-2 py-1 border rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="block font-semibold mb-1">カテゴリ手数料 </label>
          <select
            value={selectedCategoryFee}
            onChange={(e) => setSelectedCategoryFee(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">カテゴリを選択してください</option>
            {categoryOptions.map((cat) => (
              <option key={cat.label} value={cat.value}>
                {cat.label} ({cat.value}%)
              </option>
            ))}
          </select>
        </div>
        {/* <select
          value={selectedCategoryFee}
          onChange={(e) => setSelectedCategoryFee(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">カテゴリを選択してください</option>
          {categoryOptions.map((cat) => (
            <option key={cat.label} value={cat.value}>
              {cat.label} ({cat.value}%)
            </option>
          ))}
        </select> */}
      </div>
      {/* 右カラム */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* 配送結果と利益結果を右側に移動する */}
        <p className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          VAT: {includeVAT ? "適用（135GBP以下）" : "非適用（135GBP超え）"}
        </p>
        {/* 配送結果 */}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <p>
            配送方法: {
              result === null
                ? "計算中..."
                : result.method
            }
          </p>
          <p>
            配送料: {
              result === null
                ? "計算中..."
                : result.price !== null
                  ? `${result.price}円`
                  : "不明"
            }
          </p>
        </div>


        {/* 利益結果 */}
        {rate !== null && sellingPrice !== "" && (
          <Result
            priceGBP={typeof sellingPrice === "number" ? sellingPrice / rate : 0}
            rate={rate}
            includeVAT={includeVAT} // 自動判定
            calcResult={calcResult}
          />
        )}

        {final && (
          <FinalResult
            shippingMethod={result?.method || ""}
            shippingJPY={calcResult?.shippingJPY || 0}
            categoryFeeJPY={calcResult?.categoryFeeJPY || 0}
            data={final}
          />
        )}
      </div>

    </div>
  );
}
