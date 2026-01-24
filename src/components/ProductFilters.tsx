import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
    Sparkles,
    Package,
    Star,
    Check,
    Minus,
    Plus,
    RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
    categories: string[];
    selectedCategories: string[];
    toggleCategory: (category: string) => void;
    priceRange: [number, number];
    setPriceRange: (value: [number, number]) => void;
    availabilityFilter: string;
    setAvailabilityFilter: (value: string) => void;
    selectedRatings: number[];
    toggleRating: (rating: number) => void;
    selectedSizes: string[];
    toggleSize: (size: string) => void;
    clearFilters: () => void;
    activeFiltersCount: number;
}

export const ProductFilters = ({
    categories,
    selectedCategories,
    toggleCategory,
    priceRange,
    setPriceRange,
    availabilityFilter,
    setAvailabilityFilter,
    selectedRatings,
    toggleRating,
    selectedSizes,
    toggleSize,
    clearFilters,
    activeFiltersCount,
}: ProductFiltersProps) => {
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pointer-events-none">
                <h2 className="text-xl font-display font-bold text-gray-800 flex items-center gap-2">
                    Filters
                </h2>
                {activeFiltersCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 pointer-events-auto h-8 px-2 text-xs"
                    >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                    </Button>
                )}
            </div>

            <Accordion type="multiple" defaultValue={["category", "price", "size"]} className="w-full space-y-4">

                {/* Categories */}
                <AccordionItem value="category" className="border-none bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/40 transition-colors">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-800">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Categories
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 group",
                                        selectedCategories.includes(cat) || (cat === "All" && selectedCategories.length === 0)
                                            ? "bg-amber-50 text-amber-900 shadow-sm"
                                            : "hover:bg-white/50 text-gray-600"
                                    )}
                                >
                                    <span className="font-medium text-sm">{cat}</span>
                                    {(selectedCategories.includes(cat) || (cat === "All" && selectedCategories.length === 0)) && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-amber-500 rounded-full p-0.5"
                                        >
                                            <Check className="h-3 w-3 text-white" />
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Price Range */}
                <AccordionItem value="price" className="border-none bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/40 transition-colors">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-800">
                            <span className="text-pink-500 font-serif italic text-lg">$</span>
                            Price Range
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-6 pt-2">
                        <div className="space-y-6">
                            <Slider
                                min={0}
                                max={1000}
                                step={10}
                                value={priceRange}
                                onValueChange={(value) => setPriceRange(value as [number, number])}
                                className="py-4"
                            />
                            <div className="flex items-center justify-between gap-4">
                                <div className="bg-white/60 px-4 py-2 rounded-xl border border-white shadow-sm w-24 text-center">
                                    <span className="text-xs text-gray-500 block text-left mb-1">Min</span>
                                    <span className="font-bold text-gray-800">${priceRange[0]}</span>
                                </div>
                                <div className="h-[1px] flex-1 bg-gray-300" />
                                <div className="bg-white/60 px-4 py-2 rounded-xl border border-white shadow-sm w-24 text-center">
                                    <span className="text-xs text-gray-500 block text-left mb-1">Max</span>
                                    <span className="font-bold text-gray-800">${priceRange[1]}</span>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Size */}
                <AccordionItem value="size" className="border-none bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/40 transition-colors">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-800">
                            <Package className="h-4 w-4 text-purple-500" />
                            Size
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                        <div className="flex flex-wrap gap-2">
                            {sizes.map((size) => (
                                <motion.button
                                    key={size}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => toggleSize(size)}
                                    className={cn(
                                        "h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 border-2",
                                        selectedSizes.includes(size)
                                            ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                                            : "border-transparent bg-white/60 text-gray-600 hover:bg-white"
                                    )}
                                >
                                    {size}
                                </motion.button>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Availability */}
                <AccordionItem value="availability" className="border-none bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/40 transition-colors">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-800">
                            <Package className="h-4 w-4 text-green-500" />
                            Availability
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'all', label: 'All Products' },
                                { id: 'in-stock', label: 'In Stock' },
                                { id: 'out-of-stock', label: 'Out of Stock' }
                            ].map((option) => (
                                <label
                                    key={option.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                        availabilityFilter === option.id
                                            ? "bg-green-50 border-green-200/50"
                                            : "hover:bg-white/50"
                                    )}
                                    onClick={() => setAvailabilityFilter(option.id)}
                                >
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                        availabilityFilter === option.id
                                            ? "border-green-500 bg-green-500"
                                            : "border-gray-300"
                                    )}>
                                        {availabilityFilter === option.id && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Ratings */}
                <AccordionItem value="rating" className="border-none bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/40 transition-colors">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-800">
                            <Star className="h-4 w-4 text-yellow-500" />
                            Rating
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                        <div className="space-y-2">
                            {[5, 4, 3].map((rating) => (
                                <div
                                    key={rating}
                                    onClick={() => toggleRating(rating)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                        selectedRatings.includes(rating)
                                            ? "bg-yellow-50 border-yellow-200/50"
                                            : "hover:bg-white/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        "h-4 w-4",
                                                        i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">& Up</span>
                                    </div>
                                    {selectedRatings.includes(rating) && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-yellow-400 rounded-full p-0.5"
                                        >
                                            <Check className="h-3 w-3 text-white" />
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};
