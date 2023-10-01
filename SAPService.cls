public with sharing class SAPService {
    public static Map<String, List<StockServiceModal>> getStocks(String companyCode, StockRequestModal stockRequestModal) {
        String className = SAPServiceClassMapping__mdt.getInstance('C_'+companyCode).Stock_Integration_Class_Name__c;
        if(className == null) {
            throw new CalloutException('Check stock integration settings in SAPServiceClassMapping__mdt!');
        }
        Type stockIntegrationType = Type.forName(className);
        StockIntegrationImpl stockIntegInterfaceInstance = (StockIntegrationImpl) stockIntegrationType.newInstance();
        Map<String, List<StockServiceModal>> productCodeStocksMap = stockIntegInterfaceInstance.getStocks(stockRequestModal);
        
        //converting storage location and unit field's API name to label
        Map<String, String> storageLocApiToLabel = EczUtil.getPicklistLabelMap('Control_Tables__c', 'Warehouse__c');
        Map<String, String> unitApiToLabel = EczUtil.getPicklistLabelMap('Control_Tables__c', 'Unit__c');
        for(StockServiceModal stockObj: productCodeStocksMap.values()[0]){
            String storageLocationApiName = stockObj.storageLocation;
            String storageLocationLabel = storageLocApiToLabel.get(storageLocationApiName);
            String unitApiName = stockObj.unit;
            String unitLabel = unitApiToLabel.get(unitApiName);
            stockObj.storageLocation = storageLocationLabel;
            stockObj.unitLabel = unitLabel;
        }
        return productCodeStocksMap;
    }
