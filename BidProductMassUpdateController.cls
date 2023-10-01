/**
 * @author            : salihcendik
 * @last modified on  : 26-09-2023
 * @last modified by  : salih.cendik
**/
public with sharing class BidProductMassUpdateController {
    @AuraEnabled(cacheable=true)
    public static List<RTM_Bid_Bid_Product__c> fetchBidProductsByBidId(String bidId) {
        return [SELECT Id, SAP_Item_Number__c, RTM_Bid_Product__c, Product_Code__c, Product_Image_Link__c, RTM_Bid_Product_Name__c, 
        RTM_Bid_Quantity__c, toLabel(Base_Unit__c) UnitLabel, RTM_Bid_Unit_Price__c, CurrencyIsoCode, RTM_Bid_Bid__r.Name, RTM_Bid_Bid__r.CurrencyIsoCode, RTM_Bid_Bid__r.Sales_Org__c, RTM_Bid_Bid__r.Order_Type__c,
        RTM_Bid_Bid__r.Company__c
        FROM RTM_Bid_Bid_Product__c 
        WHERE RTM_Bid_Bid__c = :bidId
        ORDER BY SAP_Item_Number__c ASC];
    }

    @AuraEnabled
    public static List<LookUpSearchModel> searchProduct(String searchTerm){
        try {
            List<Product2> products = getProducts(searchTerm);
            if(products.isEmpty()) {
                throw new DmlException('No Product!');
            }

            List<LookUpSearchModel> results = new List<LookUpSearchModel>();
            for (Product2 product : products) {
                LookUpSearchModel result = new LookUpSearchModel();
                result.recordId = product.Id;
                result.label = product.Name;
                result.secondaryLabel = product.ProductCode;
                result.baseUnitOfProduct = product.BaseUnitOfMeasure__c;
                result.imageURL = product.Product_Image_Link__c;
                result.icon = 'standard:product';
                results.add(result);
            }
            return results;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static List<Product2> getProducts(String searchTerm) {
        String searchLike;
        if(searchTerm.contains('%')) {
            searchLike = searchTerm;
        } else {
            searchLike = '%' + searchTerm + '%';
        }
        return [SELECT Id, Name, ProductCode, BaseUnitOfMeasure__c, Product_Image_Link__c 
        FROM Product2 
        WHERE ProductCode LIKE :searchLike OR Name LIKE :searchLike];
    }

    @AuraEnabled
    public static Map<String, List<StockServiceModal>> getStockInfo(List<String> productCodes, RTM_Bid_Bid__c bid){
        String company = bid.Company__c;
        String accountNumber = 'Q1029'; 
        String accountStorageRule = null;
        String orderType = bid.Order_Type__c; 
        String salesOrg = bid.Sales_Org__c; 
        String webShopType = null;
        StockRequestModal stockRequestModal = new StockRequestModal(productCodes, accountNumber, accountStorageRule, orderType, salesOrg, webshopType);
        try {
            Map<String, List<StockServiceModal>> stocksFromStockService = SAPService.getStocks(company, stockRequestModal);
            return stocksFromStockService;
        }
        catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void upsertBidItems(List<RTM_Bid_Bid_Product__c> bidItems) {
        try {
            System.debug('bidItems:'+bidItems);
            upsert bidItems;
        }
        catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }   
    }

    public class LookUpSearchModel {
        @AuraEnabled
        public String recordId { get; set;}       
        @AuraEnabled
        public String label { get; set;}     
        @AuraEnabled
        public String secondaryLabel { get; set; }
        @AuraEnabled
        public String baseUnitOfProduct { get; set; }
        @AuraEnabled
        public String icon { get; set; }
        @AuraEnabled
        public String imageURL { get; set; }
    }
}