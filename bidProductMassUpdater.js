/**
 * @author            : salih.cendik
 * @last modified on  : 26-09-2023
 * @last modified by  : salih.cendik
**/
import { LightningElement, track, wire, api } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, deleteRecord } from 'lightning/uiRecordApi';
import LightningConfirm from 'lightning/confirm';
//APEX
import { refreshApex } from '@salesforce/apex';
import fetchBidProductsByBidId from '@salesforce/apex/BidProductMassUpdateController.fetchBidProductsByBidId';
import getStockInfo from '@salesforce/apex/BidProductMassUpdateController.getStockInfo';
import searchProduct from '@salesforce/apex/BidProductMassUpdateController.searchProduct';
import upsertBidItems from '@salesforce/apex/BidProductMassUpdateController.upsertBidItems';
//LABELS
import lbl_Currency from '@salesforce/label/c.Currency';
import lbl_Stock from '@salesforce/label/c.Stock';
//SCHEMA
import BIDPRODUCT_OBJECT from '@salesforce/schema/RTM_Bid_Bid_Product__c';
//FIELDS
import COMPANY_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.Company__c";
import SALESORG_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.Sales_Org__c";
import ORDERTYPE_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.Order_Type__c";
import NAME_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.Name";
import CURRENCY_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.CurrencyIsoCode";
import STATUS_FIELD from "@salesforce/schema/RTM_Bid_Bid__c.RTM_Bid_Status__c";
//RESOURSE
import noImage from '@salesforce/resourceUrl/noImage';

const bidFIELDS = [COMPANY_FIELD, SALESORG_FIELD, ORDERTYPE_FIELD, NAME_FIELD, CURRENCY_FIELD, STATUS_FIELD];
export default class BidProductMassUpdater extends LightningElement {
    showSpinner = false;
    @api recordId = 'a143L000002GPhLQAW';
    @track label = { lbl_Currency, lbl_Stock };
    theBid = {};
    wiredBidProducts = [];
    @track bidItems = [];
    unitApiToLabel = new Map([
        ['ST', 'Adet'],
        ['CS', 'Kutu'],
        ['M2', 'm2'],
        ['PAN', 'Panel'],
        ['SRT', 'Şerit']
    ]);

    @wire(getRecord, { recordId: '$recordId', fields: bidFIELDS })
    BidInfo({ error, data }) {
        if (data) {
            console.log('getBid():', data);
            const bidObj = {};
            const fields = Object.keys(data.fields);
            for (const field of fields) {
                bidObj[field] = data.fields[field].value;
            }
            this.theBid = bidObj;
        } else if (error) {
            console.log('getBid() error:', error);
        }
    }

    @wire(getObjectInfo, { objectApiName: BIDPRODUCT_OBJECT })
    bidItemInfo({ data, error }) {
        if (data) {
            this.label.productCode = data.fields.Product_Code__c.label;
            this.label.productName = data.fields.RTM_Bid_Product__c.label;
            this.label.quantity = data.fields.RTM_Bid_Quantity__c.label;
            this.label.unit = data.fields.Unit__c.label;
            this.label.unitPrice = data.fields.RTM_Bid_Unit_Price__c.label;
            this.label.currency = this.label.lbl_Currency;
            this.label.stock = this.label.lbl_Stock;
        } else if (error) {
            console.log('bidItemInfo Error', error);
        }
    }

    @wire(fetchBidProductsByBidId, { bidId: '$recordId' })
    wiredBidItems(result) {
        this.wiredBidProducts = result;
        const { data, error } = result;
        if (data) {
            console.log('Existing Bid Items: ', data);
            this.bidItems = JSON.parse(JSON.stringify(data));
        } else if (error) {
            console.log('Existing Bid Items - Error:', error);
        }
    }

    getStocks(event) {
        const index = event.target.dataset.id;
        const prodCode = event.target.dataset.code;

        this.showSpinner = true;
        getStockInfo({ productCodes: [prodCode], bid: this.theBid })
            .then(result => {
                console.log('getStocks() result', result);
                if (result) {
                    const stocks = Object.values(result)[0];
                    const stockOptions = this.generateStockOptions(stocks);
                    this.updateOrderItemByIndex(index, 'stockOptions', stockOptions)
                }
            })
            .catch(error => {
                console.log('Error:', error);
                this.showToast('Error', error.body.message, 'error');
            }).finally(() => {
                this.showSpinner = false;
            });
    }

    generateStockOptions(stocks) {
        const stockOptions = [];
        stocks.forEach(item => {
            stockOptions.push({
                label: item.partyNumber + '-' + item.quantity + '-' + item.unitLabel + '-' + item.storageLocationId,
                value: item.partyNumber + '-' + item.quantity + '-' + item.storageLocationId + '-' + item.productionLocation
            })
        });
        return stockOptions;
    }
    handleStockChange(event) {
        const index = event.target.dataset.id;
        const selectedStock = event.detail.value;
        const stockInfos = selectedStock.split('-');
        const partNumber = stockInfos[0];
        const quantity = stockInfos[1];
        const storageLocationId = stockInfos[2];
        const productionLocation = stockInfos[3];

        const newBidItems = this.bidItems.filter(() => true);
        const bidItem = this.filterOrderItemByIndex(newBidItems, index);
        bidItem.maxQuantity = Number(quantity);
        bidItem.RTM_Bid_Quantity__c = Number(quantity);
        bidItem.Batch__c = partNumber;
        bidItem.Plant__c = productionLocation;
        bidItem.Warehouse__c = storageLocationId;
        this.bidItems = newBidItems;
    }

    async handleProductSearch(searchTerm) {
        try {
            return await searchProduct({ searchTerm });
        } catch (e) {
            console.log(e.body.message);
        }
    }

    handleProductSelect(event) {
        const { recordId, index, label, productCode, baseUnitOfProduct, imageURL } = event.detail;
        const newBidItems = this.bidItems.filter(() => true);
        const bidItem = newBidItems.filter(item => item.SAP_Item_Number__c == index)[0] || {};
        bidItem.RTM_Bid_Product__c = recordId;
        bidItem.Product_Code__c = productCode;
        bidItem.Base_Unit__c = baseUnitOfProduct;
        bidItem.Product_Image_Link__c = imageURL || noImage;
        bidItem.UnitLabel = this.unitApiToLabel.get(baseUnitOfProduct);
        this.bidItems = newBidItems;
    }

    handleQtyChange(event) {
        const index = event.target.dataset.id;
        let selectedQuantity = Number(event.target.value);
        this.updateOrderItemByIndex(index, 'RTM_Bid_Quantity__c', selectedQuantity);
    }

    handleUnitPriceChange(event) {
        const index = event.target.dataset.id;
        const unitPrice = Number(event.target.value);
        this.updateOrderItemByIndex(index, 'RTM_Bid_Unit_Price__c', unitPrice);
    }

    handleAddItem() {
        let newBidItems = this.bidItems;
        const lastItemIndex = 10;
        if (newBidItems.length > 0) {
            const lastSapNo = newBidItems[newBidItems.length - 1].SAP_Item_Number__c;
            lastItemIndex = Number(lastSapNo) + 10;
        }
        const newBidItem = { SAP_Item_Number__c: String(lastItemIndex), RTM_Bid_Bid__c: this.recordId, RTM_Bid_Quantity__c: 1, CurrencyIsoCode: this.theBid.CurrencyIsoCode, Product_Image_Link__c: noImage }
        newBidItems.push(newBidItem);
        this.bidItems = newBidItems;
    }

    handleDeleteItem(event) {
        const index = event.target.dataset.id;
        const bidItemRecordId = event.target.dataset.recordid;
        if (bidItemRecordId) {
            this.deleteBidProduct(bidItemRecordId);
        } else {
            this.removeDraftBidItem(index);
        }
    }

    removeDraftBidItem(index) {
        const newBidItems = this.bidItems.filter((item) => item.SAP_Item_Number__c != index).sort((a, b) => a.SAP_Item_Number__c > b.SAP_Item_Number__c ? 1 : -1);
        this.bidItems = newBidItems;
    }

    async deleteBidProduct(bidItemRecordId) {
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete the record?',
            variant: 'header',
            label: 'Delete Record',
            theme: 'error',
        });

        if (result) {
            this.showSpinner = true;
            deleteRecord(bidItemRecordId)
                .then(() => {
                    refreshApex(this.wiredBidProducts);
                    this.showToast('Success', 'Record deleted', 'success');
                })
                .catch((error) => {
                    this.showToast('Error', error.body.message, 'error');
                }).finally(() => {
                    this.showSpinner = false;
                });
        }
    }

    handleBrokenImage(event) {
        event.target.src = noImage;
    }

    handleSave() {
        this.showSpinner = true;
        if (!this.formValidator()) {
            this.showSpinner = false;
            return false;
        }
        this.sendBidItemsToServer();
    }

    sendBidItemsToServer() {
        const updatedBidItems = this.bidItems.map(item => ({ ...item, Base_Unit_Quantity__c: item.RTM_Bid_Quantity__c }));
        upsertBidItems({ bidItems: updatedBidItems })
            .then(result => {
                console.log('Result', result);
                refreshApex(this.wiredBidProducts);
                this.showToast('Saved Successfully', '', 'success');
            })
            .catch(error => {
                console.log('Error:', error);
                this.showToast('Upsert Error', error.body.message, 'error');
            }).finally(() => {
                this.showSpinner = false;
            });
    }

    formValidator() {
        for (let index = 0; index < this.bidItems.length; index++) {
            const bidItem = this.bidItems[index];
            if (!bidItem.RTM_Bid_Quantity__c || !bidItem.RTM_Bid_Product__c) {
                this.showToast('Required Fields', `SAP No #${bidItem.SAP_Item_Number__c}: Please check the blank fields`, 'error');
                return false;
            }
        }
        return true;
    }

    updateOrderItemByIndex(index, key, value) {
        const newbidItems = this.bidItems.filter(() => true);
        const orderItem = this.filterOrderItemByIndex(newbidItems, index);
        orderItem[key] = value;
        this.bidItems = newbidItems;
    }

    filterOrderItemByIndex(list, index) {
        return list.filter(item => item.SAP_Item_Number__c == index)[0] || {};
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        }));
    }

    get disableButton() {
        return this.theBid.RTM_Bid_Status__c != 'Open';
    }
}