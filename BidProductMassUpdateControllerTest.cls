/**
 * @author            : salih.cendik
 * @last modified on  : 26-09-2023
 * @last modified by  : salih.cendik
**/
@isTest
public with sharing class BidProductMassUpdateControllerTest {
    @testSetup
    private static void testSetup() {
        RTM_Bid_Bid__c newBid = new RTM_Bid_Bid__c(
            Name = 'Test Bid',
            Sales_Org__c = '2101',
            Distribution_Channel__c = '10',
            Division__c = '10',
            Payment_Term__c = 'M001',
            CurrencyIsoCode = 'TRY',
            Company__c = '2100'
        );
        insert newBid;
        
        Product2 product = new Product2(
            Name = 'Test',
            ProductCode = '100',
            BaseUnitOfMeasure__c = 'CS',
            IsActive = true,
            ProductHierarchy__c = '123');
        insert product;

        ProductConvertion__c prodCon = new ProductConvertion__c(
            Product__c = product.Id,
            Quantity__c = 1,
            Unit__c = 'M2',
            ConversionRate__c = 1);
        insert prodCon;
        
        ProductConvertion__c prodCon2 = new ProductConvertion__c(
            Product__c = product.Id,
            Quantity__c = 1,
            Unit__c = 'CS',
            ConversionRate__c = 1.2);
        insert prodCon2;

        RTM_Bid_Bid_Product__c newBidProd = new RTM_Bid_Bid_Product__c(
            RTM_Bid_Bid__c = newBid.Id,
            SAP_Item_Number__c = '10',
            RTM_Bid_Product__c = product.Id,
            RTM_Bid_Quantity__c = 1,
            Plant__c = '2110',
            Base_Unit__c = 'M2',
            Batch__c = '1VA57VTE2D',
            Warehouse__c = 'K020',
            RTM_Bid_Unit_Price__c = 10);
        insert newBidProd;

    }
    
    @IsTest
    static void testFetchBidProductsByBidId(){
        RTM_Bid_Bid__c trBid =  [SELECT Id FROM RTM_Bid_Bid__c LIMIT 1];
        List<RTM_Bid_Bid_Product__c> bidProds = BidProductMassUpdateController.fetchBidProductsByBidId(trBid.Id);
        System.assert(!bidProds.isEmpty());
    }

    @IsTest
    static void testSearchProduct_Case1(){
        Product2 product =  [SELECT Id, Name FROM Product2 LIMIT 1];
        String searchTerm = product.Name;
        List<BidProductMassUpdateController.LookUpSearchModel> searchModels = BidProductMassUpdateController.searchProduct(searchTerm);
        System.assert(searchModels[0].label == product.Name);
    }

    @IsTest
    static void testSearchProduct_Case2(){
        Product2 product =  [SELECT Id, Name FROM Product2 LIMIT 1];
        String searchTerm = product.Name + '%';
        List<BidProductMassUpdateController.LookUpSearchModel> searchModels = BidProductMassUpdateController.searchProduct(searchTerm);
        System.assert(searchModels[0].label == product.Name);
    }

    @IsTest
    static void testSearchProduct_Case3(){
        String searchTerm = 'NoName';
        try {
            BidProductMassUpdateController.searchProduct(searchTerm);
        } catch (Exception e) {
            System.assertEquals(e.getTypeName(), 'System.AuraHandledException');
        }
    }

    @IsTest
    static void testGetStockInfo(){
        Test.startTest();
        RTM_Bid_Bid__c trBid =  [SELECT Id, Sales_Org__c, Order_Type__c, Company__c FROM RTM_Bid_Bid__c LIMIT 1];
        Product2 prod =  [SELECT ProductCode FROM Product2 LIMIT 1];
        Test.setMock(WebServiceMock.class, new ECZ_TR_StockIntegrationMock());
        Map<String, List<StockServiceModal>> stocks = BidProductMassUpdateController.getStockInfo(new List<String>{prod.ProductCode}, trBid);
        Test.stopTest();
        System.assert(stocks != null);
    }

    @IsTest
    static void testUpsertBidItems(){
        RTM_Bid_Bid__c trBid = [SELECT Id, (SELECT Id, RTM_Bid_Quantity__c FROM Bid_Products__r LIMIT 1) 
        FROM RTM_Bid_Bid__c LIMIT 1];
        trBid.Bid_Products__r[0].RTM_Bid_Quantity__c = 2;
        BidProductMassUpdateController.upsertBidItems(trBid.Bid_Products__r);
        System.assert([SELECT RTM_Bid_Quantity__c FROM RTM_Bid_Bid_Product__c WHERE RTM_Bid_Bid__c = :trBid.Id LIMIT 1].RTM_Bid_Quantity__c == 2);
    }
}